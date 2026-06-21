EMCC ?= emcc
OUT ?= ../../samples/doom.wasm
DOOMGENERIC_DIR ?= third_party/doomgeneric/doomgeneric
BUILD_DIR ?= obj

OVERLAY_SOURCES := \
	src/aik_doom_abi.c \
	src/aik_doom_wad.c \
	src/aik_doom_input.c \
	src/aik_doom_time.c \
	src/aik_doom_log.c \
	src/aik_doom_wad_file.c \
	src/aik_doom_sound.c \
	src/doomgeneric_aikernel.c

UPSTREAM_SOURCES := $(wildcard $(DOOMGENERIC_DIR)/*.c)
EXCLUDED_UPSTREAM_SOURCES := \
	$(DOOMGENERIC_DIR)/doomgeneric_allegro.c \
	$(DOOMGENERIC_DIR)/doomgeneric_emscripten.c \
	$(DOOMGENERIC_DIR)/doomgeneric_linuxvt.c \
	$(DOOMGENERIC_DIR)/doomgeneric_sdl.c \
	$(DOOMGENERIC_DIR)/doomgeneric_soso.c \
	$(DOOMGENERIC_DIR)/doomgeneric_sosox.c \
	$(DOOMGENERIC_DIR)/doomgeneric_win.c \
	$(DOOMGENERIC_DIR)/doomgeneric_xlib.c \
	$(DOOMGENERIC_DIR)/i_allegromusic.c \
	$(DOOMGENERIC_DIR)/i_allegrosound.c \
	$(DOOMGENERIC_DIR)/i_cdmus.c \
	$(DOOMGENERIC_DIR)/i_sdlmusic.c \
	$(DOOMGENERIC_DIR)/i_sdlsound.c \
	$(DOOMGENERIC_DIR)/w_file.c \
	$(DOOMGENERIC_DIR)/w_file_stdc.c

DOOMGENERIC_SOURCES := $(filter-out $(EXCLUDED_UPSTREAM_SOURCES),$(UPSTREAM_SOURCES))

EXPORTS := '["_main","_doom_init","_doom_tick","_doom_render","_doom_input","_doom_input_action","_doom_mount_wad","_doom_wad_status","_doom_audio_status","_doom_audio_sample_rate","_doom_audio_channels","_doom_audio_buffer","_doom_audio_capacity_frames","_doom_audio_read_offset_frames","_doom_audio_available_frames","_doom_audio_consume_frames","_doom_audio_event_count","_malloc","_free"]'
EMCC_FLAGS := -O3 -sWASM=1 -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sEXPORTED_FUNCTIONS=$(EXPORTS) -sALLOW_MEMORY_GROWTH=1 -sERROR_ON_UNDEFINED_SYMBOLS=0 -DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200 -DCMAP256=1 -DAIKERNEL_DOOM_WASM=1 -DFEATURE_SOUND=1 -Iinclude -I$(DOOMGENERIC_DIR)

.PHONY: all check clean

all: check
	$(EMCC) $(EMCC_FLAGS) $(OVERLAY_SOURCES) $(DOOMGENERIC_SOURCES) -o $(OUT)

check:
	@test -d "$(DOOMGENERIC_DIR)" || (echo "doomgeneric source missing: $(DOOMGENERIC_DIR). Run tools/fetch-doomgeneric.sh with a pinned commit."; exit 2)
	@command -v $(EMCC) >/dev/null 2>&1 || (echo "emcc not found. Install/activate Emscripten or run without BuildDoomWasm=true."; exit 3)

clean:
	rm -rf "$(BUILD_DIR)" "$(OUT)"
