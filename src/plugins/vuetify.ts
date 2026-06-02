import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

// ─── BMA Doctor Light Theme ────────────────────────────────────────────────────
// Primary: BMA green #00744B | Medical status: error=Emergency, warning=Urgency,
// info=Elective, success=InRange | Typography: Sarabun (Thai) + Inter (data)

const bmaLight: ThemeDefinition = {
  dark: false,
  colors: {
    // Brand primary — BMA green scale
    primary:             '#00744B',
    'primary-darken-1':  '#006A33',
    'primary-darken-2':  '#215A41',
    'primary-lighten-1': '#5DB088',
    'primary-lighten-2': '#8DCBAA',
    'primary-lighten-3': '#C3E6D4',
    'primary-lighten-4': '#E6F5EE',

    // Secondary — muted neutral for secondary actions
    secondary:             '#454545',
    'secondary-lighten-1': '#595959',
    'secondary-lighten-2': '#8C8C8C',
    'secondary-lighten-3': '#BFBFBF',
    'secondary-lighten-4': '#D9D9D9',

    // Surfaces
    background:          '#F5F5F5',
    surface:             '#FFFFFF',
    'surface-bright':    '#FFFFFF',
    'surface-light':     '#FAFAFA',
    'surface-variant':   '#F0F0F0',

    // Text on surfaces
    'on-background':        '#343330',
    'on-surface':           '#343330',
    'on-surface-variant':   '#454545',
    'on-primary':           '#FFFFFF',
    'on-secondary':         '#FFFFFF',

    // Medical status semantic colors
    // error   → EMERGENCY (critical, life-threatening)
    // warning → URGENCY   (urgent, needs prompt attention)
    // info    → ELECTIVE  (scheduled, non-urgent)
    // success → IN RANGE / GOAL MET
    error:       '#B72C2C',
    warning:     '#FB8C00',
    info:        '#2B478B',
    success:     '#4CAF50',
    'on-error':   '#FFFFFF',
    'on-warning': '#FFFFFF',
    'on-info':    '#FFFFFF',
    'on-success': '#FFFFFF',
  },

  variables: {
    // Border and divider defaults
    'border-color':     '#D9D9D9',
    'border-opacity':   1,

    // Interactive state opacities (Material Design spec)
    'hover-opacity':     0.04,
    'focus-opacity':     0.12,
    'selected-opacity':  0.08,
    'activated-opacity': 0.12,
    'pressed-opacity':   0.12,
    'dragged-opacity':   0.08,
    'disabled-opacity':  0.38,

    // Shadow elevation tokens — referenced in overrides.scss
    // Format: plain CSS box-shadow value (no quotes needed in Vuetify vars)
    'shadow-xs':   '0 1px 2px rgba(0,0,0,0.06)',
    'shadow-card': '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    'shadow-md':   '0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
    'shadow-lg':   '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
  },
}

// ─── Vuetify instance ──────────────────────────────────────────────────────────
export default createVuetify({
  theme: {
    defaultTheme: 'bmaLight',
    themes: { bmaLight },
  },

  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
    // NOTE: Replace with Phosphor Icons for production per design spec.
    // Install @phosphor-icons/vue and wire up a custom icon set adapter.
  },

  defaults: {
    // ── Buttons ──────────────────────────────────────────────────────────────
    // No VBtn defaults needed — SASS handles typography and border-radius.
    // variant, color, elevation are declared explicitly on each <v-btn> in templates
    // to prevent leaking into internal VBtn instances of composite components.

    // ── Cards ─────────────────────────────────────────────────────────────────
    // Shadow and exact radius are controlled in overrides.scss — defaults provide
    // the semantic shape cue (rounded-lg) and suppress Material elevation.
    // VCard: rounded not set — border-radius 12px is handled in overrides.scss
    // (SASS gives 8px from root; 12px requires explicit CSS override)
    VCard: {
      elevation: 0,
    },

    // ── Date / Time pickers ───────────────────────────────────────────────────
    VDatePicker: {
      color:      'primary',
      hideHeader: true,
      elevation:  0,
    },

    // ── Form controls ─────────────────────────────────────────────────────────
    VTextField: {
      variant:     'outlined',
      color:       'primary',
      density:     'comfortable',
      hideDetails: 'auto',
      rounded:     'md',
    },
    VSelect: {
      variant:     'outlined',
      color:       'primary',
      density:     'comfortable',
      hideDetails: 'auto',
      rounded:     'md',
    },
    VAutocomplete: {
      variant:     'outlined',
      color:       'primary',
      density:     'comfortable',
      hideDetails: 'auto',
      rounded:     'md',
    },
    VTextarea: {
      variant:     'outlined',
      color:       'primary',
      density:     'comfortable',
      hideDetails: 'auto',
      rounded:     'md',
    },
    VCombobox: {
      variant:     'outlined',
      color:       'primary',
      density:     'comfortable',
      hideDetails: 'auto',
      rounded:     'md',
    },

    // ── Chips / badges ────────────────────────────────────────────────────────
    VChip: {
      rounded: 'pill',
    },

    // ── Navigation ────────────────────────────────────────────────────────────
    // VNavigationDrawer: elevation not set — $navigation-drawer-elevation: 0 in SASS by default
    VNavigationDrawer: {
      border: 'thin',
    },
    VAppBar: {
      elevation: 0,
      border:    'b-thin',
      height:    64,
    },

    // ── Lists (nav items use v-list-item) ─────────────────────────────────────
    VList: {
      density: 'comfortable',
      nav:     true,
    },
    VListItem: {
      rounded: 'md',
    },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    VTabs: {
      color:       'primary',
      sliderColor: 'primary',
      density:     'comfortable',
      alignTabs:   'start',
    },
    VTab: {
      style: 'text-transform: none; letter-spacing: 0; font-family: Sarabun, sans-serif;',
    },

    // ── Data tables ───────────────────────────────────────────────────────────
    VDataTable: {
      density:     'comfortable',
      hover:       true,
    },
    VDataTableRow: {
      style: 'font-size: 13px;',
    },

    // ── Dialogs ───────────────────────────────────────────────────────────────
    VDialog: {
      rounded:  'xl',   // → 16px
      maxWidth: 560,
    },
    VSheet: {
      rounded: 'lg',
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    VTooltip: {
      location: 'top',
    },
    VSnackbar: {
      rounded:   'lg',
      elevation: 0,
      location:  'bottom end',
    },
    VAlert: {
      rounded:   'lg',
      elevation: 0,
    },
    VBadge: {
      color: 'error',
    },
    VPagination: {
      rounded:      'md',
      activeColor:  'primary',
      density:      'comfortable',
      totalVisible: 5,
    },
  },
})
