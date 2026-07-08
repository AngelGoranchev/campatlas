import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: page('./index.html'),
        login: page('./login.html'),
        register: page('./register.html'),
        campsites: page('./campsites.html'),
        campsiteDetails: page('./campsite-details.html'),
        createCampsite: page('./create-campsite.html'),
        editCampsite: page('./edit-campsite.html'),
        profile: page('./profile.html'),
        admin: page('./admin.html'),
      },
    },
  },
});
