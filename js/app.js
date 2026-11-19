"use strict";

const body = document.body;
const menuButton = document.querySelector("[data-menu-button]");
const sidebar = document.querySelector("[data-sidebar]");
const backdrop = document.querySelector("[data-sidebar-backdrop]");
const menuLabel = menuButton ? menuButton.querySelector("[data-menu-label]") : null;

function setMenu(open) {
  body.classList.toggle("menu-open", open);

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", String(open));
  }

  if (menuLabel) {
    menuLabel.textContent = open ? "Close navigation" : "Open navigation";
  }

  if (sidebar) {
    const mobileView = window.innerWidth < 768;
    sidebar.setAttribute("aria-hidden", String(mobileView ? !open : false));
  }
}

if (menuButton) {
  menuButton.addEventListener("click", () => {
    setMenu(!body.classList.contains("menu-open"));
  });
}

if (backdrop) {
  backdrop.addEventListener("click", () => setMenu(false));
}

document.querySelectorAll("[data-nav-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.getAttribute("href") === "#") {
      event.preventDefault();
    }
    if (window.innerWidth < 768) {
      setMenu(false);
    }
  });
});

window.addEventListener("resize", () => {
  setMenu(window.innerWidth >= 768 ? false : body.classList.contains("menu-open"));
});

document.querySelectorAll("[data-tab-list]").forEach((tabList) => {
  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => {
        item.setAttribute("aria-selected", "false");
        item.setAttribute("tabindex", "-1");

        const controlledPanel = document.getElementById(item.getAttribute("aria-controls"));
        if (controlledPanel) controlledPanel.hidden = true;
      });

      tab.setAttribute("aria-selected", "true");
      tab.setAttribute("tabindex", "0");

      const controlledPanel = document.getElementById(tab.getAttribute("aria-controls"));
      if (controlledPanel) controlledPanel.hidden = false;
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      let nextIndex = index;

      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;

      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });

    if (index === 0) {
      tab.setAttribute("tabindex", "0");
    } else {
      tab.setAttribute("tabindex", "-1");
    }
  });
});

document.querySelectorAll("[data-filter-chip]").forEach((chip) => {
  chip.addEventListener("click", () => {
    const pressed = chip.getAttribute("aria-pressed") === "true";
    chip.setAttribute("aria-pressed", String(!pressed));
  });
});

const dialog = document.querySelector("[data-foundation-dialog]");
const dialogOpenButtons = document.querySelectorAll("[data-open-dialog]");
const dialogCloseButtons = document.querySelectorAll("[data-close-dialog]");

dialogOpenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });
});

dialogCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (dialog) dialog.close();
  });
});

if (dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

setMenu(false);
