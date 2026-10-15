const std = @import("std");
const UpdateChannel = enum { stable, dev };
const WasmSurface = enum { none, core };
const NapiSurface = enum { none, core };

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const commit = readGitCommit(b);
    addNapiArtifact(b, .core, target, commit, "0.1.0", .dev);
    addWasmArtifact(b, .core, commit, "0.1.0", .dev);

    const contract = b.addModule("om_contract", .{
        .root_source_file = b.path("src/core/agent/runtime/work_contract.zig"),
        .target = target,
        .optimize = .safe,
    });
    const tests = b.addTest(.{ .root_module = contract });
    const run = b.addRunArtifact(tests);
    b.step("test", "Test contract validation and disposition").dependOn(&run.step);
}

fn addWasmArtifact(
    b: *std.Build,
    surface: WasmSurface,
    git_commit: []const u8,
    app_version: []const u8,
    update_channel: UpdateChannel,
) void {
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .wasi,
    });
    const name = switch (surface) {
        .core => "om-core",
        .none => unreachable,
    };
    const description = switch (surface) {
        .core => "Build the headless om WebAssembly artifact",
        .none => unreachable,
    };

    const wasm_options = b.addOptions();
    wasm_options.addOption([]const u8, "git_commit", git_commit);
    wasm_options.addOption([]const u8, "app_version", app_version);
    wasm_options.addOption([]const u8, "update_channel", @tagName(update_channel));
    wasm_options.addOption(WasmSurface, "wasm_surface", surface);

    const wasm_root = switch (surface) {
        .core => "src/wasm_core_main.zig",
        .none => unreachable,
    };
    const wasm_exe = b.addExecutable(.{
        .name = name,
        .root_module = b.createModule(.{
            .root_source_file = b.path(wasm_root),
            .target = wasm_target,
            .optimize = .small,
            .single_threaded = true,
            .link_libc = true,
            .stack_check = false,
            .stack_protector = false,
            .omit_frame_pointer = true,
            .unwind_tables = .none,
            .error_tracing = false,
            .strip = true,
        }),
    });
    if (surface == .core) wasm_exe.stack_size = 1024 * 1024;
    wasm_exe.root_module.addImport("build_options", wasm_options.createModule());
    _ = addSessionManager(b, wasm_exe.root_module, wasm_target, .small, true);

    const install_wasm = b.addInstallArtifact(wasm_exe, .{});
    const wasm_step = b.step("wasm", description);
    wasm_step.dependOn(&install_wasm.step);
    b.getInstallStep().dependOn(&install_wasm.step);
}

fn addNapiArtifact(
    b: *std.Build,
    surface: NapiSurface,
    target: std.Build.ResolvedTarget,
    git_commit: []const u8,
    app_version: []const u8,
    update_channel: UpdateChannel,
) void {
    const napi_options = b.addOptions();
    napi_options.addOption([]const u8, "git_commit", git_commit);
    napi_options.addOption([]const u8, "app_version", app_version);
    napi_options.addOption([]const u8, "update_channel", @tagName(update_channel));
    napi_options.addOption(NapiSurface, "napi_surface", surface);

    const root = switch (surface) {
        .core => "src/napi_core_main.zig",
        .none => unreachable,
    };
    const lib = b.addLibrary(.{
        .name = "om",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path(root),
            .target = target,
            .optimize = .safe,
            .link_libc = true,
            .strip = true,
        }),
    });
    lib.root_module.addImport("build_options", napi_options.createModule());
    _ = addSessionManager(b, lib.root_module, target, .safe, null);
    const node_include = b.option(
        []const u8,
        "node-include-dir",
        "Directory containing node_api.h for the N-API addon",
    ) orelse discoverNodeIncludeDir(b);
    const node_api = b.addTranslateC(.{
        .root_source_file = .{ .cwd_relative = b.pathJoin(&.{ node_include, "node_api.h" }) },
        .target = target,
        .optimize = .safe,
    });
    node_api.addSystemIncludePath(.{ .cwd_relative = node_include });
    lib.root_module.addImport("node_api", node_api.createModule());
    lib.linker_allow_shlib_undefined = true;

    const install = b.addInstallArtifact(lib, .{ .dest_sub_path = "om.node" });
    const step = b.step("native", "Build the om Node-API core addon");
    step.dependOn(&install.step);
    b.getInstallStep().dependOn(&install.step);
}

fn discoverNodeIncludeDir(b: *std.Build) []const u8 {
    const out = switch (b.runFallible(
        &.{ "node", "-p", "require('node:path').join(require('node:path').dirname(process.execPath), '..', 'include', 'node')" },
        .{ .stderr_behavior = .ignore },
    )) {
        .success => |stdout| stdout,
        .spawn_failed, .crashed => std.process.fatal("Node.js is required to locate node_api.h; pass -Dnode-include-dir=<path>", .{}),
        .bad_exit_code => std.process.fatal("could not locate node_api.h; pass -Dnode-include-dir=<path>", .{}),
    };
    const trimmed = std.mem.trim(u8, out, " \t\r\n");
    return b.allocator.dupe(u8, trimmed) catch std.process.fatal("could not allocate Node include path", .{});
}

fn readGitCommit(b: *std.Build) []const u8 {
    // The configure cache cannot see a new commit, so rerun configure.
    b.graph.poisonCache();
    const out = switch (b.runFallible(
        &.{ "git", "rev-parse", "--short=12", "HEAD" },
        .{ .stderr_behavior = .ignore },
    )) {
        .success => |stdout| stdout,
        .spawn_failed, .bad_exit_code, .crashed => return "unknown",
    };
    const trimmed = std.mem.trim(u8, out, " \t\r\n");
    return b.allocator.dupe(u8, trimmed) catch "unknown";
}

/// The session manager as its own module, rooted at its API. It imports
/// nothing but its own options, and a file cannot belong to two modules, so
/// fx reaches it only through `@import("session_manager")`.
fn addSessionManager(
    b: *std.Build,
    importer: *std.Build.Module,
    target: std.Build.ResolvedTarget,
    optimize: std.lang.Optimize,
    single_threaded: ?bool,
) *std.Build.Module {
    const options = b.addOptions();
    options.addOption(bool, "hooks", false);
    options.addOptionPathUntracked("trace_dir", b.graph.path(.install_prefix, "session-manager-traces"));
    options.addOptionPathUntracked("src_dir", b.path("src/core/session_manager"));
    const module = b.createModule(.{
        .root_source_file = b.path("src/core/session_manager/api.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
        .single_threaded = single_threaded,
    });
    module.addImport("build_options", options.createModule());
    importer.addImport("session_manager", module);
    return module;
}
