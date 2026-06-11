#include "aik_doom_wad.h"

#if defined(__has_include)
#if __has_include("w_file.h")
#include "w_file.h"
#define AIK_DOOM_HAS_W_FILE 1
#endif
#endif

#include <stdlib.h>
#include <string.h>

#if defined(AIK_DOOM_HAS_W_FILE)
static void aik_wad_close_file(wad_file_t *file)
{
    free(file);
}

static size_t aik_wad_read(wad_file_t *file, unsigned int offset, void *buffer, size_t buffer_len)
{
    aik_doom_wad_view_t wad = aik_doom_get_wad();
    size_t remaining;
    size_t readable;

    (void)file;

    if (!wad.mounted || buffer == 0 || offset >= wad.size) {
        return 0U;
    }

    remaining = wad.size - offset;
    readable = buffer_len < remaining ? buffer_len : remaining;
    memcpy(buffer, wad.data + offset, readable);
    return readable;
}

static wad_file_class_t g_aik_memory_wad_class = {
    0,
    aik_wad_close_file,
    aik_wad_read
};

wad_file_t *W_OpenFile(char *path)
{
    aik_doom_wad_view_t wad = aik_doom_get_wad();
    wad_file_t *file;

    (void)path;

    if (!wad.mounted) {
        return 0;
    }

    file = (wad_file_t *)calloc(1U, sizeof(wad_file_t));
    if (file == 0) {
        return 0;
    }

    file->file_class = &g_aik_memory_wad_class;
    file->mapped = (byte *)wad.data;
    file->length = (unsigned int)wad.size;
    return file;
}

void W_CloseFile(wad_file_t *wad)
{
    if (wad != 0 && wad->file_class != 0 && wad->file_class->CloseFile != 0) {
        wad->file_class->CloseFile(wad);
    }
}

size_t W_Read(wad_file_t *wad, unsigned int offset, void *buffer, size_t buffer_len)
{
    if (wad == 0 || wad->file_class == 0 || wad->file_class->Read == 0) {
        return 0U;
    }

    return wad->file_class->Read(wad, offset, buffer, buffer_len);
}
#endif
