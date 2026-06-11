#include "aik_doom_wad.h"

#include <string.h>

static aik_doom_wad_view_t g_wad = {0};

int aik_doom_validate_wad_header(const uint8_t *data, size_t size)
{
    if (data == 0) {
        return AIK_DOOM_ERROR_WAD_MISSING;
    }

    if (size < 12U) {
        return AIK_DOOM_ERROR_WAD_SIZE_INVALID;
    }

    if (memcmp(data, "IWAD", 4U) != 0 && memcmp(data, "PWAD", 4U) != 0) {
        return AIK_DOOM_ERROR_WAD_HEADER_INVALID;
    }

    return AIK_DOOM_OK;
}

int aik_doom_mount_wad(const uint8_t *data, size_t size)
{
    int validated = aik_doom_validate_wad_header(data, size);
    if (validated != AIK_DOOM_OK) {
        g_wad.data = 0;
        g_wad.size = 0U;
        g_wad.mounted = 0;
        return validated;
    }

    g_wad.data = data;
    g_wad.size = size;
    g_wad.mounted = 1;
    return AIK_DOOM_OK;
}

int aik_doom_wad_status(void)
{
    return g_wad.mounted ? AIK_DOOM_OK : AIK_DOOM_ERROR_WAD_MISSING;
}

aik_doom_wad_view_t aik_doom_get_wad(void)
{
    return g_wad;
}
