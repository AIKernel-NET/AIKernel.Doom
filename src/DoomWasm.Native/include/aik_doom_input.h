#ifndef AIK_DOOM_INPUT_H
#define AIK_DOOM_INPUT_H

#include <stdint.h>
#include "aik_doom_result.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct aik_doom_key_event {
    int keycode;
    int pressed;
} aik_doom_key_event_t;

void aik_doom_input_reset(void);
int aik_doom_input_push(int keycode, int pressed);
int aik_doom_input_pop(aik_doom_key_event_t *event_out);

#ifdef __cplusplus
}
#endif

#endif
