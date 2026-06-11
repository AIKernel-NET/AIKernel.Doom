#ifndef AIK_DOOM_RESULT_H
#define AIK_DOOM_RESULT_H

#ifdef __cplusplus
extern "C" {
#endif

typedef enum aik_doom_result {
    AIK_DOOM_OK = 0,
    AIK_DOOM_ERROR_NOT_INITIALIZED = -1,
    AIK_DOOM_ERROR_WAD_MISSING = -2,
    AIK_DOOM_ERROR_WAD_SIZE_INVALID = -3,
    AIK_DOOM_ERROR_WAD_HEADER_INVALID = -4,
    AIK_DOOM_ERROR_FRAMEBUFFER_UNAVAILABLE = -5,
    AIK_DOOM_ERROR_INPUT_QUEUE_FULL = -6
} aik_doom_result_t;

#ifdef __cplusplus
}
#endif

#endif
