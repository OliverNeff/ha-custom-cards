import {defineConfig} from 'vite';

export default defineConfig({
    server: { host: true, port: 5173 },
    build: {
        target: 'es2022',
        sourcemap: true,
        minify: false,
        lib: {
            entry: 'src/transit-messages-card.js',
            name: 'TransitMessagesCard',
            formats: ['es'],
            fileName: () => 'transit-messages-card.js',
        },
        rollupOptions: {
            // Keine externen Abhängigkeiten auslagern – wir wollen 1 ES-Modul
        }
    }
});
