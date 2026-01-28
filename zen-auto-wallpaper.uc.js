class ZenWallpapers {
  constructor() {
    this.init();
  }

  async init() {
    Services.scriptloader.loadSubScript("chrome://browser/content/setDesktopBackground.js", window);
    await this.waitForDependencies();
    gZenWorkspaces.addChangeListeners(() => this.updateDesktopBg());
  }

  waitForDependencies() {
    return new Promise((resolve) => {
      const id = setInterval(() => {
        const deps = ["gZenWorkspaces", "gSetBackground"]
        
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

  fallbackImg = {
    src: "file:///C:/Windows/Web/4K/Wallpaper/Windows/img19_1920x1200.jpg",
    position: "FILL"
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
    const currWorkspaceId = gZenWorkspaces.getActiveWorkspace().uuid;
    // Temporary backup for proof of concept. Remove fallback when able to save images.
    return this.images[currWorkspaceId] ?? this.fallbackImg;
  }
  
  rgbToHex(rgb) {
    const [ r, g, b ] = rgb.replace(/rgb\(|\)/g, "").split(", ");
    return gSetBackground._rgbToHex(r, g, b);
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
    gSetBackground._backgroundColor = currImage.bgColor ?? this.rgbToHex(document.documentElement.style.getPropertyValue("--zen-primary-color"));

    await image.decode();
    gSetBackground.setDesktopBackground();
  }
}

if (document.readyState === "complete") {
  window.gZenWallpapers = new ZenWallpapers();
} else {
  window.addEventListener("load", () => {
    window.gZenWallpapers = new ZenWallpapers();
  });
}
