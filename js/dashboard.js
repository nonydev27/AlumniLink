"use strict";

const dashboardDialog = document.querySelector("[data-dashboard-dialog]");
const dashboardDialogTitle = document.querySelector("#dashboard-dialog-title");
const dashboardDialogMessage = document.querySelector("#dashboard-dialog-message");
const dashboardFeedback = document.querySelector("[data-dashboard-feedback]");
const searchFeedback = document.querySelector("[data-search-feedback]");
const mobileMenuButton = document.querySelector("[data-menu-button]");
const mobileSidebar = document.querySelector("[data-sidebar]");
const mobileBackdrop = document.querySelector("[data-sidebar-backdrop]");

function updateMobileSidebarInert() {
  if (!mobileSidebar) return;

  const drawerClosed = window.innerWidth < 768 && !document.body.classList.contains("menu-open");
  mobileSidebar.inert = drawerClosed;
}

updateMobileSidebarInert();

if (mobileMenuButton) {
  mobileMenuButton.addEventListener("click", () => {
    updateMobileSidebarInert();

    if (document.body.classList.contains("menu-open")) {
      const firstLink = mobileSidebar && mobileSidebar.querySelector("[data-nav-link]");
      if (firstLink) firstLink.focus();
    } else {
      mobileMenuButton.focus();
    }
  });
}

if (mobileSidebar) {
  mobileSidebar.querySelectorAll("[data-nav-link]").forEach((link) => {
    link.addEventListener("click", () => {
      updateMobileSidebarInert();
      if (window.innerWidth < 768 && mobileMenuButton) mobileMenuButton.focus();
    });
  });
}

if (mobileBackdrop && mobileMenuButton) {
  mobileBackdrop.addEventListener("click", () => {
    updateMobileSidebarInert();
    mobileMenuButton.focus();
  });
}

window.addEventListener("resize", updateMobileSidebarInert);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dashboardDialog && dashboardDialog.open) {
    dashboardDialog.close();
    return;
  }

  if (event.key === "Escape" && document.body.classList.contains("menu-open") && mobileMenuButton) {
    mobileMenuButton.click();
  }
});

function showDashboardDialog(title, message) {
  if (!dashboardDialog || !dashboardDialogTitle || !dashboardDialogMessage) {
    return;
  }

  dashboardDialogTitle.textContent = title;
  dashboardDialogMessage.textContent = message;

  if (typeof dashboardDialog.showModal === "function") {
    dashboardDialog.showModal();
  }
}

document.querySelectorAll("[data-demo-action]").forEach((button) => {
  button.addEventListener("click", () => {
    showDashboardDialog(
      button.dataset.dialogTitle || "Preview action",
      button.dataset.dialogMessage || "This is a frontend-only preview. No backend action was performed."
    );
  });
});

document.querySelectorAll("[data-close-dashboard-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    if (dashboardDialog) dashboardDialog.close();
  });
});

if (dashboardDialog) {
  dashboardDialog.addEventListener("click", (event) => {
    if (event.target === dashboardDialog) dashboardDialog.close();
  });
}

document.querySelectorAll("[data-role-switch]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-role-switch]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    const roleContext = document.querySelector("[data-role-context]");
    if (roleContext) {
      const role = button.dataset.roleSwitch;
      roleContext.textContent = `${role} preview selected. Dashboard information remains illustrative sample content.`;
    }

    const roleBadgeLabel = document.querySelector("[data-role-badge-label]");
    if (roleBadgeLabel) {
      roleBadgeLabel.textContent = `${button.dataset.roleSwitch} (Oxford)`;
    }
  });
});

document.querySelectorAll("[data-dismiss-mentor]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".mentor-card");
    const heading = card ? card.querySelector("h3") : null;
    const name = heading && heading.firstChild ? heading.firstChild.textContent.trim() : "This mentor";
    const remainingCards = Array.from(document.querySelectorAll(".mentor-card"))
      .filter((mentorCard) => mentorCard !== card && !mentorCard.hidden);

    if (card) card.remove();
    if (dashboardFeedback) {
      dashboardFeedback.textContent = `${name} was dismissed in this preview. This choice was not saved to an account.`;
    }

    const emptyMessage = document.querySelector("[data-no-mentors]");
    if (remainingCards.length > 0) {
      const nextDismissButton = remainingCards[0].querySelector("[data-dismiss-mentor]");
      if (nextDismissButton) nextDismissButton.focus();
    } else if (emptyMessage) {
      emptyMessage.hidden = false;
      emptyMessage.focus();
    }
  });
});

document.querySelectorAll("[data-ai-feedback]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-ai-feedback]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });

    if (dashboardFeedback) {
      dashboardFeedback.textContent = `Thank you. Your feedback is only shown in this preview and was not submitted.`;
    }
  });
});

document.querySelectorAll("[data-save-opportunity]").forEach((button) => {
  button.addEventListener("click", () => {
    const saved = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(saved));
    button.textContent = saved ? "Saved" : "Save";

    const opportunity = button.closest(".opportunity-card");
    const title = opportunity ? opportunity.querySelector("h3").textContent.trim() : "Opportunity";
    button.setAttribute("aria-label", `${saved ? "Unsave" : "Save"} ${title}`);

    if (dashboardFeedback) {
      dashboardFeedback.textContent = `${title} ${saved ? "saved" : "removed from saved"} in this preview only.`;
    }
  });
});

const completionCard = document.querySelector(".completion-card");
const dismissCompletion = document.querySelector("[data-dismiss-completion]");

if (dismissCompletion) {
  dismissCompletion.addEventListener("click", () => {
    if (completionCard) completionCard.hidden = true;
    if (dashboardFeedback) dashboardFeedback.textContent = "The profile reminder was dismissed for this preview only.";
  });
}

const dashboardSearch = document.querySelector("[data-dashboard-search]");
const searchableItems = Array.from(document.querySelectorAll("[data-searchable]"));

if (dashboardSearch) {
  dashboardSearch.addEventListener("input", () => {
    const query = dashboardSearch.value.trim().toLocaleLowerCase();
    let visibleMentors = 0;
    let visibleOpportunities = 0;

    searchableItems.forEach((item) => {
      if (!item.isConnected) return;

      const matches = !query || (item.dataset.searchText || item.textContent).toLocaleLowerCase().includes(query);
      item.hidden = !matches;

      if (matches && item.classList.contains("mentor-card")) visibleMentors += 1;
      if (matches && item.classList.contains("opportunity-card")) visibleOpportunities += 1;
    });

    const noMentors = document.querySelector("[data-no-mentors]");
    const noOpportunities = document.querySelector("[data-no-opportunities]");
    if (noMentors) noMentors.hidden = visibleMentors > 0;
    if (noOpportunities) noOpportunities.hidden = visibleOpportunities > 0;

    if (searchFeedback) {
      searchFeedback.textContent = query
        ? `Search results: ${visibleMentors} mentor suggestions and ${visibleOpportunities} opportunities.`
        : "";
    }
  });
}
