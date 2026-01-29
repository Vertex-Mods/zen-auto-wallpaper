class ZenWallpapers {
  constructor() {
    this.init();
  }

  async init() {
    Services.scriptloader.loadSubScript("chrome://browser/content/setDesktopBackground.js", window);
    await this.waitForDependencies();
    gZenWorkspaces.addChangeListeners(() => this.updateDesktopBg());
    this.initUploadBtn();
  }

  waitForDependencies() {
    return new Promise((resolve) => {
      const id = setInterval(() => {
        const deps = ["gZenWorkspaces", "gSetBackground"];

        let depsExist = true;
        for (const dep of deps) {
          if (!window.hasOwnProperty(dep)) {
            depsExist = false;
          }
        }

        if (depsExist) {
          clearInterval(id);
          resolve();
        }
      }, 50);
    });
  }

  waitForElm(selector) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) {
        return resolve(el);
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  fallbackImg = {
    src: "file:///C:/Windows/Web/4K/Wallpaper/Windows/img19_1920x1200.jpg",
    position: "FILL",
  };

  get activeWorkspaceId() {
    return gZenWorkspaces.getActiveWorkspace().uuid;
  }

  get images() {
    const savedImages = SessionStore.getCustomWindowValue(window, "workspaceImages") || "{}";
    return JSON.parse(savedImages);
  }

  set images(newImages) {
    const newImagesStr = JSON.stringify(newImages);
    SessionStore.setCustomWindowValue(window, "workspaceImages", newImagesStr);
  }

  get currImage() {
    // Temporary backup for proof of concept. Remove fallback when able to save images.
    return this.images[this.activeWorkspaceId] ?? this.fallbackImg;
  }

  rgbToHex(rgb) {
    const [r, g, b] = rgb.replace(/rgb\(|\)/g, "").split(", ");
    return gSetBackground._rgbToHex(r, g, b);
  }

  async initUploadBtn() {
    const themePicker = await this.waitForElm(".zen-theme-picker-gradient");

    const uploadFrag = MozXULElement.parseXULToFragment(`
      <button id="wallpaper-upload-btn" class="subviewbutton"/>
    `);
    themePicker.appendChild(uploadFrag);

    const uploadBtn = document.querySelector("#wallpaper-upload-btn");
    uploadBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const upload = document.createElement("input");
      upload.type = "file";
      upload.click();

      upload.addEventListener("change", () => {
        const systemPath = upload.files[0].mozFullPath;
        const fileURI = Services.io.newFileURI(new FileUtils.File(systemPath)).spec;

        const images = this.images;
        images[this.activeWorkspaceId] = {
          src: fileURI,
          position: "FILL",
        };
        this.images = images;

        this.updateDesktopBg();
      });
    });
  }

  setDesktopBackground() {
    gSetBackground.setDesktopBackground();
    return new Promise(resolve => {
      const img = gSetBackground._image;

      if (img.complete && img.naturalWidth !== 0) {
        resolve();
      } else {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      }
    });
  }

  async updateDesktopBg() {
    const fakeElement = document.createElement("div");
    fakeElement.id = "menuPosition";
    document.body.appendChild(fakeElement);

    const currImage = this.currImage;
    if (!currImage) return;

    const image = document.createElement("img");
    image.src = currImage.src;
    gSetBackground._image = image;

    gSetBackground._imageName = "Custom background";
    gSetBackground._position = currImage.position;
    gSetBackground._backgroundColor =
      currImage.bgColor ??
      this.rgbToHex(document.documentElement.style.getPropertyValue("--zen-primary-color"));

    await image.decode();
    await this.setDesktopBackground();

    fakeElement.remove();

    gZenThemePicker.onWorkspaceChange(gZenWorkspaces.getActiveWorkspace());
  }
}

if (document.readyState === "complete") {
  window.gZenWallpapers = new ZenWallpapers();
} else {
  window.addEventListener("load", () => {
    window.gZenWallpapers = new ZenWallpapers();
  });
}
