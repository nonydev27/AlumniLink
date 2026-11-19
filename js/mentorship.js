"use strict";

const mentorshipFeedback = document.querySelector("[data-mentorship-feedback]");
const filterForm = document.querySelector("[data-mentor-filter-form]");
const mentorSearch = document.querySelector("[data-mentor-search]");
const globalSearch = document.querySelector("[data-global-search]");
const mentorGrid = document.querySelector("[data-mentor-grid]");
const resultCount = document.querySelector("[data-result-count]");
const paginationSummary = document.querySelector("[data-pagination-summary]");
const appliedFilters = document.querySelector("[data-applied-filters]");
const mentorEmpty = document.querySelector("[data-mentor-empty]");
const domainButtons = Array.from(document.querySelectorAll("[data-domain]"));
const suggestionEmpty = document.querySelector("[data-suggestion-empty]");
const aiContent = Array.from(document.querySelectorAll("[data-ai-content]"));
const aiDisabledMessage = document.querySelector("[data-ai-disabled-message]");
const mentorshipDialog = document.querySelector("[data-mentorship-dialog]");
const mentorshipDialogTitle = document.querySelector("#mentorship-dialog-title");
const mentorshipDialogMessage = document.querySelector("[data-mentorship-dialog-message]");
const closeDialogButtons = document.querySelectorAll("[data-close-mentorship-dialog]");
const confirmRequestButton = document.querySelector("[data-confirm-mentorship]");
const mentorCards = Array.from(document.querySelectorAll("[data-mentor-card]"));
const mentorPagination = document.querySelector(".mentor-pagination");
const mobileMenuButton = document.querySelector("[data-menu-button]");
const mobileSidebar = document.querySelector("[data-sidebar]");
const mobileBackdrop = document.querySelector("[data-sidebar-backdrop]");
let selectedDomain = "all";
let dialogReturnFocus = null;
let pendingRequest = null;

function announce(message) {
  if (mentorshipFeedback) mentorshipFeedback.textContent = message;
}

function updateMobileSidebarInert() {
  if (!mobileSidebar) return;
  mobileSidebar.inert = window.innerWidth < 768 && !document.body.classList.contains("menu-open");
}

updateMobileSidebarInert();

if (mobileMenuButton && mobileSidebar) {
  mobileMenuButton.addEventListener("click", () => {
    updateMobileSidebarInert();
    if (document.body.classList.contains("menu-open")) {
      const firstLink = mobileSidebar.querySelector("[data-nav-link]");
      if (firstLink) firstLink.focus();
    } else {
      mobileMenuButton.focus();
    }
  });

  mobileSidebar.querySelectorAll("[data-nav-link]").forEach((link) => {
    link.addEventListener("click", () => {
      updateMobileSidebarInert();
      if (window.innerWidth < 768) mobileMenuButton.focus();
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
  if (event.key === "Escape" && document.body.classList.contains("menu-open") && mobileMenuButton) {
    mobileMenuButton.click();
  }
});

function openDialog(title, message, options) {
  if (!mentorshipDialog || !mentorshipDialogTitle || !mentorshipDialogMessage) return;

  const settings = options || {};
  dialogReturnFocus = settings.trigger || document.activeElement;
  pendingRequest = settings.onConfirm || null;
  mentorshipDialogTitle.textContent = title;
  mentorshipDialogMessage.textContent = message;

  if (confirmRequestButton) {
    confirmRequestButton.hidden = !pendingRequest;
    confirmRequestButton.textContent = settings.confirmText || "Mark request in preview";
  }

  if (typeof mentorshipDialog.showModal === "function") mentorshipDialog.showModal();
}

function closeDialog() {
  if (mentorshipDialog && mentorshipDialog.open) mentorshipDialog.close();
}

closeDialogButtons.forEach((button) => {
  button.addEventListener("click", closeDialog);
});

if (confirmRequestButton) {
  confirmRequestButton.addEventListener("click", () => {
    if (pendingRequest) pendingRequest();
    closeDialog();
  });
}

if (mentorshipDialog) {
  mentorshipDialog.addEventListener("click", (event) => {
    if (event.target === mentorshipDialog) closeDialog();
  });

  mentorshipDialog.addEventListener("close", () => {
    if (dialogReturnFocus && typeof dialogReturnFocus.focus === "function") dialogReturnFocus.focus();
    dialogReturnFocus = null;
    pendingRequest = null;
  });
}

document.querySelectorAll("[data-preview-action]").forEach((button) => {
  button.addEventListener("click", () => {
    openDialog(
      button.dataset.dialogTitle || "Preview action",
      button.dataset.dialogMessage || "This frontend preview is not connected to an account or service.",
      { trigger: button }
    );
  });
});

function selectedFilters() {
  return Array.from(document.querySelectorAll("[data-mentor-filter]"));
}

function getFilterLabel(select) {
  const option = select.options[select.selectedIndex];
  return option ? option.textContent.trim() : "";
}

function renderAppliedFilters() {
  if (!appliedFilters) return;

  appliedFilters.replaceChildren();
  selectedFilters().forEach((select) => {
    if (select.value === "all") return;

    const chip = document.createElement("button");
    chip.className = "applied-filter-chip";
    chip.type = "button";
    chip.dataset.removeFilter = select.dataset.mentorFilter;
    chip.setAttribute("aria-label", `Remove ${getFilterLabel(select)} filter`);

    const label = document.createElement("span");
    label.textContent = getFilterLabel(select);
    const close = document.createElement("span");
    close.setAttribute("aria-hidden", "true");
    close.textContent = "×";
    chip.append(label, close);
    appliedFilters.append(chip);
  });

  if (selectedDomain !== "all") {
    const selectedButton = domainButtons.find((button) => button.dataset.domain === selectedDomain);
    if (selectedButton) {
      const chip = document.createElement("button");
      chip.className = "applied-filter-chip";
      chip.type = "button";
      chip.dataset.removeDomain = "true";
      chip.setAttribute("aria-label", `Remove ${selectedButton.querySelector(".domain-card__name").textContent.trim()} domain filter`);

      const label = document.createElement("span");
      label.textContent = selectedButton.querySelector(".domain-card__name").textContent.trim();
      const close = document.createElement("span");
      close.setAttribute("aria-hidden", "true");
      close.textContent = "×";
      chip.append(label, close);
      appliedFilters.append(chip);
    }
  }

  const hasFilters = appliedFilters.childElementCount > 0;
  const label = document.querySelector(".applied-filters__label");
  if (label) label.hidden = !hasFilters;
  if (!hasFilters) {
    const empty = document.createElement("span");
    empty.className = "applied-filters__label";
    empty.textContent = "None";
    appliedFilters.append(empty);
  }
}

function matchesGraduation(card, value) {
  if (value === "all") return true;
  const year = Number(card.dataset.gradYear);
  if (value === "2020-plus") return year >= 2020;
  if (value === "2015-2019") return year >= 2015 && year <= 2019;
  if (value === "before-2015") return year < 2015;
  return true;
}

function matchesExperience(card, value) {
  if (value === "all") return true;
  const years = Number(card.dataset.experience);
  if (value === "0-3") return years <= 3;
  if (value === "4-7") return years >= 4 && years <= 7;
  if (value === "8-plus") return years >= 8;
  return true;
}

function mentorMatches(card, filters, query) {
  const searchText = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase();
  if (query && !searchText.includes(query)) return false;
  if (filters.programme !== "all" && !card.dataset.programme.split(" ").includes(filters.programme)) return false;
  if (filters.expertise !== "all" && !card.dataset.expertise.split(" ").includes(filters.expertise)) return false;
  if (!matchesGraduation(card, filters.graduation)) return false;
  if (!matchesExperience(card, filters.experience)) return false;
  if (filters.location !== "all" && card.dataset.location !== filters.location) return false;
  if (filters.availability === "week" && card.dataset.available !== "true") return false;
  if (selectedDomain !== "all" && !card.dataset.expertise.split(" ").includes(selectedDomain)) return false;
  return true;
}

function sortMentors() {
  if (!mentorGrid) return;
  const sortBy = document.querySelector("[data-sort-mentors]");
  const mode = sortBy ? sortBy.value : "rating";
  const cards = Array.from(mentorGrid.querySelectorAll("[data-mentor-card]"));

  cards.sort((first, second) => {
    if (mode === "experience") return Number(second.dataset.experience) - Number(first.dataset.experience);
    if (mode === "name") return first.dataset.name.localeCompare(second.dataset.name);
    return Number(second.dataset.rating) - Number(first.dataset.rating);
  });

  cards.forEach((card) => mentorGrid.append(card));
}

function applyFilters() {
  if (!mentorGrid) return;

  const filters = {};
  selectedFilters().forEach((select) => {
    filters[select.dataset.mentorFilter] = select.value;
  });
  const query = mentorSearch ? mentorSearch.value.trim().toLocaleLowerCase() : "";
  let visible = 0;

  mentorCards.forEach((card) => {
    const matches = mentorMatches(card, filters, query);
    card.hidden = !matches;
    if (matches) visible += 1;
  });

  sortMentors();
  renderAppliedFilters();

  if (resultCount) resultCount.textContent = `Showing ${visible} illustrative mentor${visible === 1 ? "" : "s"}`;
  if (paginationSummary) paginationSummary.textContent = `Showing ${visible} illustrative mentor profile${visible === 1 ? "" : "s"}`;
  if (mentorEmpty) mentorEmpty.hidden = visible > 0;
  if (mentorPagination) mentorPagination.hidden = visible === 0;
}

if (filterForm) {
  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
    announce("Mentor preview results updated.");
  });

  filterForm.addEventListener("change", (event) => {
    if (!event.target.matches("[data-mentor-filter]")) return;
    applyFilters();
    announce(`${resultCount ? resultCount.textContent : "Mentor results"} updated for the selected filters.`);
  });
  filterForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      selectedDomain = "all";
      domainButtons.forEach((button) => {
        const selected = button.dataset.domain === "all";
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      if (mentorSearch) mentorSearch.value = "";
      if (globalSearch) globalSearch.value = "";
      applyFilters();
      announce("All mentor filters were reset.");
    }, 0);
  });
}

if (mentorSearch) {
  mentorSearch.addEventListener("input", () => {
    if (globalSearch) globalSearch.value = mentorSearch.value;
    applyFilters();
  });
}

if (globalSearch) {
  globalSearch.addEventListener("input", () => {
    if (mentorSearch) mentorSearch.value = globalSearch.value;
    applyFilters();
  });
}

const appliedFilterContainer = document.querySelector("[data-applied-filters]");
if (appliedFilterContainer) {
  appliedFilterContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-filter]");
    if (removeButton) {
      const select = document.querySelector(`[data-mentor-filter="${removeButton.dataset.removeFilter}"]`);
      if (select) select.value = "all";
      applyFilters();
      announce(`${removeButton.getAttribute("aria-label").replace("Remove ", "").replace(" filter", "")} filter removed.`);
      return;
    }

    if (event.target.closest("[data-remove-domain]")) {
      selectedDomain = "all";
      domainButtons.forEach((button) => {
        const selected = button.dataset.domain === "all";
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      applyFilters();
      announce("Domain filter removed.");
    }
  });
}

domainButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const domain = button.dataset.domain;
    selectedDomain = domain === selectedDomain || domain === "all" ? "all" : domain;
    domainButtons.forEach((item) => {
      const selected = selectedDomain === "all"
        ? item.dataset.domain === "all"
        : item.dataset.domain === selectedDomain;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyFilters();
    announce(selectedDomain === "all" ? "Showing mentors across all domains." : `Showing sample mentors in ${button.querySelector(".domain-card__name").textContent.trim()}.`);
  });
});

const extraDomains = document.querySelector("[data-extra-domains]");
const toggleDomains = document.querySelector("[data-toggle-domains]");
if (extraDomains && toggleDomains) {
  toggleDomains.addEventListener("click", () => {
    const expanded = !extraDomains.hidden;
    extraDomains.hidden = expanded;
    toggleDomains.setAttribute("aria-expanded", String(!expanded));
    toggleDomains.firstChild.textContent = expanded ? "View all domains " : "Show fewer domains ";
  });
}

const viewAllMatches = document.querySelector("[data-view-all-matches]");
const availableHeading = document.querySelector("#available-title");
if (viewAllMatches && availableHeading) {
  viewAllMatches.addEventListener("click", () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    availableHeading.scrollIntoView({ behavior, block: "start" });
    availableHeading.focus({ preventScroll: true });
  });
}

document.querySelectorAll("[data-sort-mentors]").forEach((select) => {
  select.addEventListener("change", () => {
    sortMentors();
    announce(`Mentors sorted by ${select.options[select.selectedIndex].textContent.trim().toLocaleLowerCase()}.`);
  });
});

document.querySelectorAll("[data-view-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const listMode = button.dataset.viewMode === "list";
    if (mentorGrid) mentorGrid.classList.toggle("is-list", listMode);

    document.querySelectorAll("[data-view-mode]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    announce(`${listMode ? "List" : "Grid"} view selected.`);
  });
});

document.querySelectorAll("[data-view-profile]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-mentor-card]");
    if (!card) return;
    const details = [
      card.querySelector(".mentor-role").textContent.trim(),
      card.querySelector(".mentor-meta").textContent.trim(),
      card.querySelector(".mentor-bio").textContent.trim(),
      card.querySelector(".tag-list").textContent.trim()
    ].join(" · ");

    openDialog(
      `${card.dataset.name} · illustrative profile`,
      `${details} This profile is sample content and is not connected to a live account.`,
      { trigger: button }
    );
  });
});

function markRequest(button, name, kind) {
  const requested = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(requested));
  button.textContent = requested ? (kind === "connection" ? "Requested (preview)" : "Requested (preview)") : (kind === "connection" ? "Connect" : "Request");
  announce(`${name}: ${requested ? "request noted in this preview only; nothing was sent or saved." : "preview request removed."}`);
}

document.querySelectorAll("[data-request-mentorship]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-mentor-card]");
    if (!card) return;
    const alreadyRequested = button.getAttribute("aria-pressed") === "true";
    if (alreadyRequested) {
      markRequest(button, card.dataset.name, "mentorship");
      return;
    }

    openDialog(
      `Request mentorship from ${card.dataset.name}?`,
      "This is a frontend-only preview. You can mark a request locally to see its state, but no message will be sent and nothing will be saved.",
      {
        trigger: button,
        confirmText: "Mark request in preview",
        onConfirm: () => markRequest(button, card.dataset.name, "mentorship")
      }
    );
  });
});

document.querySelectorAll("[data-connect-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-suggestion-card]");
    if (!card) return;
    const alreadyRequested = button.getAttribute("aria-pressed") === "true";
    if (alreadyRequested) {
      markRequest(button, card.dataset.name, "connection");
      return;
    }

    openDialog(
      `Connect with ${card.dataset.name}?`,
      "This is an illustrative suggestion. A connection request will only be marked in this preview; nothing will be sent or saved.",
      {
        trigger: button,
        confirmText: "Mark connection in preview",
        onConfirm: () => markRequest(button, card.dataset.name, "connection")
      }
    );
  });
});

document.querySelectorAll("[data-dismiss-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-suggestion-card]");
    if (!card) return;
    const name = card.dataset.name;
    const remaining = Array.from(document.querySelectorAll("[data-suggestion-card]"))
      .filter((item) => item !== card && !item.hidden);
    card.remove();

    if (remaining.length === 0 && suggestionEmpty) {
      suggestionEmpty.hidden = false;
      suggestionEmpty.focus();
    } else if (remaining.length > 0) {
      const nextDismiss = remaining[0].querySelector("[data-dismiss-suggestion]");
      if (nextDismiss) nextDismiss.focus();
    }
    announce(`${name} was dismissed in this preview. Your choice was not saved.`);
  });
});

const toggleAiSuggestions = document.querySelector("[data-toggle-ai-suggestions]");
if (toggleAiSuggestions && aiContent.length && aiDisabledMessage) {
  toggleAiSuggestions.addEventListener("click", () => {
    const enabled = toggleAiSuggestions.getAttribute("aria-pressed") !== "true";
    toggleAiSuggestions.setAttribute("aria-pressed", String(enabled));
    toggleAiSuggestions.setAttribute("aria-label", `AI suggestions are ${enabled ? "on" : "off"}`);
    toggleAiSuggestions.textContent = enabled ? "Turn off AI suggestions" : "Turn on AI suggestions";
    aiContent.forEach((element) => {
      element.hidden = !enabled;
    });
    aiDisabledMessage.hidden = enabled;
    announce(`AI suggestions turned ${enabled ? "on" : "off"} in this preview.`);
  });
}

document.querySelectorAll("[data-report-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-suggestion-card]");
    if (!card) return;
    openDialog(
      `Report ${card.dataset.name}'s suggestion?`,
      "A report can only be marked in this preview. It will not be sent to a service or saved.",
      {
        trigger: card.querySelector("[data-dismiss-suggestion]") || button,
        confirmText: "Mark as reported in preview",
        onConfirm: () => {
          button.disabled = true;
          button.textContent = "Reported (preview)";
          announce(`${card.dataset.name}'s suggestion was marked as reported in this preview only.`);
        }
      }
    );
  });
});

document.querySelectorAll("[data-ai-feedback]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-ai-feedback]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    announce(`Thank you. Your feedback is only shown in this preview and was not submitted.`);
  });
});

applyFilters();
