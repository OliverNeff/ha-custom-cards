export function registerCardOnce(tag: string, ctor: CustomElementConstructor) {
    if (!customElements.get(tag)) {
        customElements.define(tag, ctor);
    }
}