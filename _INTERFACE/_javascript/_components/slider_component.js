/**
 * Reusable control slider.
 *
 * Presents a labelled slider and numerical input as one Vue component. The
 * component emits only value changes; storing history, updating samples and
 * deciding whether a render is needed belong to the owning editor feature.
 * Shift+drag is a slow precision gesture; double-click restores the default.
 */
app.component('control-slider', {
    props: {
        label: String,
        modelValue: Number,
        min: Number,
        max: Number,
        step: Number,
        unit: String,
        help: String,
        resetValue: Number
    },
    emits: ['update:modelValue'],

    // Tracks the starting pointer position during a precision adjustment.
    data() {
        return { fine: null };
    },

    methods: {
        // Captures the pointer when the user requests a fine adjustment.
        startFine(pointerEvent) {
            if (!pointerEvent.shiftKey) return;
            pointerEvent.preventDefault();
            pointerEvent.stopPropagation();
            this.fine = {
                x: pointerEvent.clientX,
                v: this.modelValue,
                id: pointerEvent.pointerId
            };
            pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
        },

        // Maps horizontal pointer travel to a smaller change than normal dragging.
        moveFine(pointerEvent) {
            if (!this.fine) return;
            const controlRange = (this.max - this.min) || 1;
            const proposedValue = clamp(
                this.fine.v + (pointerEvent.clientX - this.fine.x) * controlRange / 2200,
                this.min,
                this.max
            );
            const resolution = this.step || 0.01;
            this.update(Math.round(proposedValue / resolution) * resolution);
        },

        // Releases fine-adjustment state when a drag ends or is cancelled.
        endFine() {
            this.fine = null;
        },

        // Validates, bounds and emits one requested numeric value.
        update(newValue) {
            if (newValue === '') return;
            const numericValue = Number(newValue);
            if (Number.isFinite(numericValue)) {
                this.$emit('update:modelValue', clamp(numericValue, this.min, this.max));
            }
        },

        // Restores the configured default while preserving unrelated settings.
        reset() {
            const hasDefault = typeof this.resetValue === 'number' && Number.isFinite(this.resetValue);
            this.update(hasDefault ? this.resetValue : this.min);
        }
    },

    template: MOD_TABLE_SLIDER_TEMPLATE
});
