(function () {
  "use strict";

  function createImports(runtime, options = {}) {
    const textDecoder = options.textDecoder || new TextDecoder();
    const output = options.console || console;

    function memoryView() {
      return new DataView(runtime.exports.memory.buffer);
    }

    function writeU32(ptr, value) {
      memoryView().setUint32(ptr, value, true);
    }

    function writeU64(ptr, value) {
      memoryView().setBigUint64(ptr, BigInt(value), true);
    }

    function fdWrite(fd, iovs, iovsLen, nwritten) {
      let written = 0;
      const memory = new Uint8Array(runtime.exports.memory.buffer);
      const view = memoryView();
      const chunks = [];
      let captured = 0;
      for (let index = 0; index < iovsLen; index += 1) {
        const iov = iovs + index * 8;
        const ptr = view.getUint32(iov, true);
        const len = view.getUint32(iov + 4, true);
        written += len;
        if (captured < 2048) {
          const take = Math.min(len, 2048 - captured);
          chunks.push(memory.slice(ptr, ptr + take));
          captured += take;
        }
      }

      if (chunks.length) {
        const text = textDecoder.decode(concatBytes(chunks)).trim();
        if (text) {
          output[fd === 2 ? "warn" : "log"](text);
        }
      }

      writeU32(nwritten, written);
      return 0;
    }

    return {
      env: {
        emscripten_sleep: () => 0,
        emscripten_notify_memory_growth: () => {},
        __syscall_unlinkat: () => 0,
        __syscall_rmdir: () => 0,
        __syscall_renameat: () => 0,
        _emscripten_system: () => 0
      },
      wasi_snapshot_preview1: {
        args_sizes_get: (argc, argvBufSize) => {
          writeU32(argc, 0);
          writeU32(argvBufSize, 0);
          return 0;
        },
        args_get: () => 0,
        proc_exit: (code) => {
          throw new Error(`WASI proc_exit(${code})`);
        },
        clock_time_get: (_clockId, _precision, timePtr) => {
          writeU64(timePtr, BigInt(Date.now()) * 1000000n);
          return 0;
        },
        fd_write: fdWrite,
        fd_read: (_fd, _iovs, _iovsLen, nread) => {
          writeU32(nread, 0);
          return 0;
        },
        fd_close: () => 0,
        fd_seek: (_fd, _offset, _whence, newOffset) => {
          writeU64(newOffset, 0);
          return 0;
        }
      }
    };
  }

  function concatBytes(chunks) {
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  self.AIKernelDoomWasmImports = Object.freeze({
    createImports,
    concatBytes
  });
})();
