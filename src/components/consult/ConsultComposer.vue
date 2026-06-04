<template>
  <div class="consult-composer">

    <!-- Unified composer box — single surface, zero internal dividers -->
    <div
      class="composer-box"
      :class="isEmergencyFocus ? 'composer-box--emergency' : ''"
    >
      <!-- Attached file chips (visible only when files are queued) -->
      <div v-if="files.length" class="composer-files">
        <div
          v-for="(f, i) in files"
          :key="f.name + i"
          class="composer-file-chip"
        >
          <PhFile :size="12" />
          <span class="file-name">{{ f.name }}</span>
          <button
            class="file-remove"
            :aria-label="`ลบ ${f.name}`"
            @click="removeFile(i)"
          >
            <PhX :size="10" />
          </button>
        </div>
      </div>

      <!-- Native textarea — no Vuetify chrome -->
      <textarea
        ref="textareaEl"
        v-model="text"
        class="composer-textarea"
        placeholder="พิมพ์ข้อความปรึกษา..."
        :disabled="disabled"
        aria-label="พิมพ์ข้อความปรึกษา"
        @input="onInput"
        @keydown="onKeydown"
      />

      <!-- Toolbar: + (left) + send (right) — same surface as textarea, no border-top -->
      <div class="composer-toolbar">
        <div class="composer-left">
          <button
            class="composer-add"
            title="แนบไฟล์"
            :disabled="disabled"
            aria-label="แนบไฟล์"
            @click="triggerFileInput"
          >
            <PhPlus :size="18" />
          </button>
          <input
            ref="fileInputEl"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            style="display:none"
            @change="onFilesChange"
          />
        </div>
        <v-btn
          icon
          size="small"
          :color="canSend ? 'primary' : undefined"
          :variant="canSend ? 'flat' : 'tonal'"
          :disabled="!canSend || disabled"
          aria-label="ส่งข้อความ"
          @click="send"
        >
          <PhPaperPlaneRight :size="16" />
        </v-btn>
      </div>
    </div>

    <!-- Protocol suggestion chips — below box, scroll horizontal -->
    <div
      v-if="suggestions.length"
      class="composer-suggestions"
      role="list"
      aria-label="ข้อความแนะนำตามสภาวะทางคลินิก"
    >
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        role="listitem"
        class="composer-suggestion"
        :class="isUrgent ? 'composer-suggestion--urgent' : ''"
        :title="s"
        @click="applySuggestion(s)"
      >{{ s }}</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { PhPlus, PhFile, PhX, PhPaperPlaneRight } from '@phosphor-icons/vue'

type InrStatus = 'therapeutic' | 'low' | 'supra' | 'very-high' | 'critical' | 'emergency'

// INR states that trigger urgent visuals on suggestion chips
const URGENT_STATES: InrStatus[]    = ['very-high', 'critical', 'emergency']
// INR states that also change the composer's focus ring to emergency color
const EMERGENCY_STATES: InrStatus[] = ['critical', 'emergency']

const MAX_TEXTAREA_HEIGHT = 160   // ~6 lines at 14px / 1.6 line-height

const props = withDefaults(defineProps<{
  suggestions: string[]
  // senderName / senderRole: reserved for future WebSocket real-time implementation.
  // When socket auth is added, the current user's identity will flow through here
  // and the composer will show a "ส่งในนาม: นพ. สุรชัย" badge above the input.
  senderName:  string
  senderRole:  'doctor' | 'pharmacist' | 'nurse'
  inrStatus?:  InrStatus
  disabled?:   boolean
}>(), {
  suggestions: () => [],
  senderRole:  'doctor',
  disabled:    false,
})

const emit = defineEmits<{
  send: [payload: { text: string; files: File[] }]
}>()

// ── Local state (owned entirely by this component) ────────────────────────────
const text        = ref('')
const files       = ref<File[]>([])
const textareaEl  = ref<HTMLTextAreaElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)

// ── Derived visual flags ──────────────────────────────────────────────────────
const canSend          = computed(() => text.value.trim().length > 0 || files.value.length > 0)
const isUrgent         = computed(() => props.inrStatus != null && URGENT_STATES.includes(props.inrStatus))
const isEmergencyFocus = computed(() => props.inrStatus != null && EMERGENCY_STATES.includes(props.inrStatus))

// ── Textarea auto-grow (JS-driven, no layout-property animation) ──────────────
function onInput() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px'
}

// ── Keyboard: Enter sends, Shift+Enter inserts newline ────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// ── Send: emit payload, reset state ──────────────────────────────────────────
function send() {
  if (!canSend.value) return
  emit('send', { text: text.value.trim(), files: files.value })
  text.value  = ''
  files.value = []
  nextTick(() => {
    if (textareaEl.value) textareaEl.value.style.height = 'auto'
  })
}

// ── Suggestion fill (edit-before-send pattern) ────────────────────────────────
function applySuggestion(s: string) {
  text.value = s
  nextTick(() => {
    if (!textareaEl.value) return
    textareaEl.value.focus()
    textareaEl.value.setSelectionRange(s.length, s.length)
    onInput()
  })
}

// ── File attachment ───────────────────────────────────────────────────────────
function triggerFileInput() { fileInputEl.value?.click() }

function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) files.value = [...files.value, ...Array.from(input.files)]
  input.value = ''
}

function removeFile(idx: number) { files.value.splice(idx, 1) }

// ── Expose clear() so parent can reset composer on patient navigation ─────────
function clear() {
  text.value  = ''
  files.value = []
  nextTick(() => {
    if (textareaEl.value) textareaEl.value.style.height = 'auto'
  })
}
defineExpose({ clear })
</script>

<style scoped>
/* ── Outer wrapper — light bg creates tonal separation from message area ──── */
.consult-composer {
  background: var(--bma-surface-light);
  padding: 10px 12px 12px;
  flex-shrink: 0;
}

/* ── Composer box: single floating surface ────────────────────────────────── */
.composer-box {
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-xl);
  background: var(--bma-surface);
  overflow: hidden;
  transition: border-color var(--bma-transition-fast),
              box-shadow var(--bma-transition-fast);
}
.composer-box:focus-within {
  border-color: var(--bma-green-300);
  box-shadow: 0 0 0 3px rgba(0, 116, 75, 0.06);
}
.composer-box--emergency:focus-within {
  border-color: var(--bma-emergency-ring);
  box-shadow: 0 0 0 3px var(--bma-emergency-ring);
}

/* ── Native textarea — zero Vuetify chrome ────────────────────────────────── */
.composer-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: var(--bma-font-thai);
  font-size: 14px;
  line-height: 1.6;
  color: var(--bma-text-primary);
  padding: 12px 14px 4px;
  min-height: 52px;
  max-height: 160px;
  overflow-y: auto;
}
.composer-textarea::placeholder {
  color: var(--bma-text-disabled);
  font-style: italic;
}
.composer-textarea:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* ── File chips ──────────────────────────────────────────────────────────── */
.composer-files {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 4px 12px 0;
}
.composer-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--bma-radius-sm);
  background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border);
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-secondary);
  max-width: 180px;
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.file-remove {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--bma-text-muted);
  flex-shrink: 0;
  line-height: 1;
}
.file-remove:hover { color: var(--bma-emergency); }

/* ── Toolbar — same surface as textarea, no separator ───────────────────── */
.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px 8px 10px;
}
.composer-left { display: flex; align-items: center; gap: 4px; }

.composer-add {
  width: 32px;
  height: 32px;
  border-radius: var(--bma-radius-md);
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--bma-text-muted);
  transition: color var(--bma-transition-fast),
              background var(--bma-transition-fast);
}
.composer-add:hover {
  color: var(--bma-text-primary);
  background: var(--bma-surface-subtle);
}
.composer-add:disabled { opacity: .4; cursor: not-allowed; }

/* ── Suggestion chips — below box, horizontal scroll ───────────────────── */
.composer-suggestions {
  display: flex;
  gap: 6px;
  padding: 8px 0 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.composer-suggestions::-webkit-scrollbar { display: none; }

.composer-suggestion {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-surface);
  border: 1px solid var(--bma-border);
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color var(--bma-transition-fast),
              color var(--bma-transition-fast),
              background var(--bma-transition-fast);
}

/* ── Normal chip states ─────────────────────────────────── */
.composer-suggestion:hover {
  border-color: var(--bma-green-300);
  color: var(--bma-green-700);
  background: var(--bma-green-50);
}
.composer-suggestion:active {
  background: var(--bma-green-100);
  border-color: var(--bma-green-500);
  color: var(--bma-green-700);
}
.composer-suggestion:focus-visible {
  outline: 2px solid var(--bma-green-500);
  outline-offset: 1px;
}

/* ── Urgent chip states (all explicitly set — no color leakage from base) ── */
.composer-suggestion--urgent {
  background: var(--bma-emergency-bg);
  border-color: var(--bma-emergency-ring);
  color: var(--bma-emergency);
}
.composer-suggestion--urgent:hover {
  background: var(--bma-emergency-bg-soft);
  border-color: var(--bma-emergency);
  color: var(--bma-emergency);  /* explicit: prevents green hover from base rule */
}
.composer-suggestion--urgent:active {
  background: var(--bma-emergency-bg);
  border-color: var(--bma-emergency);
  color: var(--bma-emergency);
}
.composer-suggestion--urgent:focus-visible {
  outline-color: var(--bma-emergency);
}
</style>
