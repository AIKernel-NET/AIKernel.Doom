#ifndef AIK_DOOM_WAD_H
#define AIK_DOOM_WAD_H

#include <stddef.h>
#include <stdint.h>
#include "aik_doom_result.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct aik_doom_wad_view {
    const uint8_t *data;
    size_t size;
    int mounted;
} aik_doom_wad_view_t;

int aik_doom_mount_wad(const uint8_t *data, size_t size);
int aik_doom_wad_status(void);
aik_doom_wad_view_t aik_doom_get_wad(void);
int aik_doom_validate_wad_header(const uint8_t *data, size_t size);

#ifdef __cplusplus
}
#endif

#endif
