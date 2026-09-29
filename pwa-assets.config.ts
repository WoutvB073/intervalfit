import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Het logo is een volledig gevuld vierkant met de inhoud in de veilige zone,
// dus geen extra marge nodig: iOS en Android ronden de hoeken zelf af.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/logo.svg'],
});
