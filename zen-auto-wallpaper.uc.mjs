class ZenWallpapers {
  constructor() {
    this.init();
  }

  async init() {
    Services.scriptloader.loadSubScript("chrome://browser/content/setDesktopBackground.js", this);
    window.addUnloadListener(this.unload);
    await this.waitForDependencies();
    gZenWorkspaces.addChangeListeners(this.updateDesktopBg.bind(this));
    this.initUploadBtn();
  }

  unload() {
    gZenWorkspaces.removeChangeListeners(this.updateDesktopBg.bind(this));
    document.getElementById("wallpaper-upload-btn").remove();
    delete window.gZenWallpapers;
  }

  waitForDependencies() {
    return new Promise((resolve) => {
      const id = setInterval(() => {
        const deps = ["gZenWorkspaces", "gSetBackground"];

        let depsExist = true;
        for (const dep of deps) {
          if (!this.hasOwnProperty(dep) && !window.hasOwnProperty(dep)) {
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
    return this.images[this.activeWorkspaceId];
  }

  rgbToHex(rgb) {
    const [r, g, b] = rgb.replace(/rgb\(|\)/g, "").split(", ");
    return this.gSetBackground._rgbToHex(r, g, b);
  }

  fileURLToDataURL(fileURL) {
    // Create a channel for the file
    const uri = Services.io.newURI(fileURL);
    const channel = Services.io.newChannelFromURI(
      uri,
      null,
      Services.scriptSecurityManager.getSystemPrincipal(),
      null,
      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      Ci.nsIContentPolicy.TYPE_OTHER
    );

    // Read file as binary
    const inputStream = channel.open();
    const binaryStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
      Ci.nsIBinaryInputStream
    );
    binaryStream.setInputStream(inputStream);

    const bytes = binaryStream.readBytes(binaryStream.available());

    binaryStream.close();
    inputStream.close();

    // Guess mime type from extension
    let mime = "image/png";
    if (fileURL.endsWith(".jpg") || fileURL.endsWith(".jpeg")) {
      mime = "image/jpeg";
    }

    return `data:${mime};base64,${btoa(bytes)}`;
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
        const dataURI = this.fileURLToDataURL(fileURI);

        const images = this.images;
        images[this.activeWorkspaceId] = {
          src: dataURI,
          position: "FILL",
        };
        this.images = images;

        this.updateDesktopBg();
      });
    });
  }

  setDesktopBackground() {
    this.gSetBackground.setDesktopBackground();
    return new Promise((resolve) => {
      const img = this.gSetBackground._image;

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
    this.gSetBackground._image = image;

    this.gSetBackground._imageName = "Custom background";
    this.gSetBackground._position = currImage.position;
    this.gSetBackground._backgroundColor =
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
