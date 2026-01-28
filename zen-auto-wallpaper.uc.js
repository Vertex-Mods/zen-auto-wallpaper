class ZenWallpapers {
  constructor() {
    Services.scriptloader.loadSubScript("chrome://browser/content/setDesktopBackground.js", window);
    gZenWorkspaces.addChangeListeners(this.updateDesktopBg.bind(this));
  }

  get images() {
    const savedImages = SessionStore.getCustomWindowValue(window, "workspaceImages");
    return JSON.parse(savedImages);
  }

  set images(newImages) {
    const newImagesStr = JSON.stringify(newImages);
    SessionStore.setCustomWindowValue(window, "workspaceImages", newImagesStr);
  }

  get currImage() {
    const currWorkspaceId = gZenWorkspaces.getActiveWorkspace().uuid;
    // Temporary backup for proof of concept. Replace with empty string fallback when able to save images.
    return this.images[currWorkspaceId] ?? "file:///C:/Windows/Web/4K/Wallpaper/Windows/img19_1920x1200.jpg";
  }

  valueToHex(color) {
    const hex = color.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  rgbToHex(rgb) {
    const [ r, g, b ] = rgb.replace(/rgb\(|\)/g, "").split(", ");
    return "#" + this.valueToHex(r) + this.valueToHex(g) + this.valueToHex(b);
  }

  updateDesktopBg() {
    const fakeElement = document.createElement("div");
    fakeElement.id = "menuPosition";
    document.body.appendChild(fakeElement);
  
    const image = document.createElement("img");
    image.src = this.currImage;
    gSetBackground._image = image;
    gSetBackground._imageName = "Windows default dark wallpaper";
  
    gSetBackground._position = "FILL";
    gSetBackground._backgroundColor = rgbToHex(document.documentElement.style.getPropertyValue("--zen-primary-color"));
    
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
