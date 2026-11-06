const API_URL = "https://rickandmortyapi.com/api/character";
const FALLBACK_IMAGE =
  "https://placehold.co/400x400/dff7ff/397b70?text=No+Image";

// COLLECTION ELEMENTS
const characterGrid = document.getElementById("characterGrid");
const loadingMessage = document.getElementById("loadingMessage");
const resultCount = document.getElementById("resultCount");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const speciesFilter = document.getElementById("speciesFilter");

const searchButton = document.getElementById("searchButton");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const pageInfo = document.getElementById("pageInfo");

// DETAILS ELEMENTS
const characterDetails = document.getElementById("characterDetails");
const detailsLoading = document.getElementById("detailsLoading");
const detailsError = document.getElementById("detailsError");
const detailsContent = document.getElementById("detailsContent");
const backButton = document.getElementById("backButton");

// COLLECTION VIEW ELEMENTS
const collectionSection = document.getElementById("characters");
const heroSection = document.querySelector(".hero");
const topbar = document.querySelector(".topbar");

let nextPageUrl = null;
let prevPageUrl = null;
let currentPage = 1;
let requestNumber = 0;
let detailsRequestNumber = 0;
let collectionScrollPosition = 0;

// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {
  loadCharacters(API_URL);
});

// SEARCH EVENTS
searchButton.addEventListener("click", searchCharacters);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchCharacters();
  }
});

function searchCharacters() {
  const params = new URLSearchParams();

  const name = searchInput.value.trim();
  const status = statusFilter.value;
  const species = speciesFilter.value;

  if (name) params.set("name", name);
  if (status) params.set("status", status);
  if (species) params.set("species", species);

  const query = params.toString();
  const url = query ? `${API_URL}/?${query}` : API_URL;

  loadCharacters(url);
}

// IMAGE FALLBACK
function setImageFallback(image) {
  image.onerror = null;
  image.src = FALLBACK_IMAGE;
}

// SAFE TEXT
function setText(id, value, fallback = "Unknown") {
  const element = document.getElementById(id);

  if (element) {
    element.textContent =
      value !== null && value !== undefined && value !== ""
        ? value
        : fallback;
  }
}

// LOAD CHARACTERS
async function loadCharacters(url) {
  const thisRequest = ++requestNumber;

  characterGrid.innerHTML = "";
  loadingMessage.style.display = "block";
  loadingMessage.textContent =
    "Connecting to the multiverse database...";

  resultCount.textContent = "LOADING...";
  prevButton.disabled = true;
  nextButton.disabled = true;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No characters found. Try another search.");
      }

      throw new Error("Unable to connect to the API. Please try again.");
    }

    const data = await response.json();

    if (thisRequest !== requestNumber) return;

    nextPageUrl = data.info.next;
    prevPageUrl = data.info.prev;

    currentPage = new URL(url).searchParams.get("page") || 1;

    resultCount.textContent =
      `${data.info.count} CHARACTERS FOUND`;

    pageInfo.textContent =
      `Page ${currentPage} of ${data.info.pages}`;

    prevButton.disabled = !prevPageUrl;
    nextButton.disabled = !nextPageUrl;

    loadingMessage.style.display = "none";

    data.results.forEach((character) => {
      createCharacterCard(character);
    });

  } catch (error) {
    if (thisRequest !== requestNumber) return;

    loadingMessage.style.display = "block";
    loadingMessage.textContent = error.message;

    resultCount.textContent = "0 CHARACTERS";
    pageInfo.textContent = "No results";
  }
}

// CREATE CHARACTER CARDS
function createCharacterCard(character) {
  const card = document.createElement("article");
  card.className = "character-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute(
    "aria-label",
    `View details for ${character.name}`
  );

  const imageWrap = document.createElement("div");
  imageWrap.className = "character-image-wrap";

  const image = document.createElement("img");
  image.src = character.image || FALLBACK_IMAGE;
  image.alt = character.name;
  image.loading = "lazy";
  image.onerror = () => setImageFallback(image);

  const badge = document.createElement("span");
  badge.className =
    `status-badge ${(character.status || "unknown").toLowerCase()}`;
  badge.textContent = character.status || "Unknown";

  imageWrap.append(image, badge);

  const info = document.createElement("div");
  info.className = "character-info";

  const name = document.createElement("h3");
  name.textContent = character.name;

  const species = document.createElement("p");
  species.textContent =
    `${character.species || "Unknown"} • ${character.gender || "Unknown"}`;

  info.append(name, species);
  card.append(imageWrap, info);

  card.addEventListener("click", () => {
    collectionScrollPosition = window.scrollY;
    showCharacterDetails(character.id);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      collectionScrollPosition = window.scrollY;
      showCharacterDetails(character.id);
    }
  });

  characterGrid.appendChild(card);
}

// SHOW DETAILS VIEW
async function showCharacterDetails(characterId) {
  const thisDetailsRequest = ++detailsRequestNumber;

  if (collectionSection) collectionSection.hidden = true;
  if (heroSection) heroSection.hidden = true;
  if (topbar) topbar.hidden = true;

  characterDetails.hidden = false;
  detailsLoading.style.display = "block";
  detailsError.hidden = true;
  detailsContent.hidden = true;

  detailsLoading.textContent = "Loading character information...";

  const episodeList = document.getElementById("episodeList");
  episodeList.innerHTML = "";

  window.scrollTo({ top: 0, behavior: "instant" });

  try {
    const response = await fetch(`${API_URL}/${characterId}`);

    if (!response.ok) {
      throw new Error("Character information could not be loaded.");
    }

    const character = await response.json();

    if (thisDetailsRequest !== detailsRequestNumber) return;

    renderCharacterDetails(character);

    detailsLoading.style.display = "none";
    detailsContent.hidden = false;

    await loadEpisodes(character.episode || [], thisDetailsRequest);

  } catch (error) {
    if (thisDetailsRequest !== detailsRequestNumber) return;
    showDetailsError(error.message);
  }
}

// DISPLAY CHARACTER INFORMATION
function renderCharacterDetails(character) {
  document.title = `${character.name} | Rift Archive`;

  const image = document.getElementById("detailImage");

  image.src = character.image || FALLBACK_IMAGE;
  image.alt = character.name || "Character image";
  image.onerror = () => setImageFallback(image);

  setText("detailName", character.name);
  setText("detailId", character.id);
  setText("detailStatus", character.status);
  setText("detailStatusText", character.status);
  setText(
    "detailSpecies",
    `${character.species || "Unknown"} • ${character.gender || "Unknown"}`
  );
  setText("detailSpeciesText", character.species);
  setText("detailType", character.type, "Not specified");
  setText("detailGender", character.gender);
  setText("detailOrigin", character.origin?.name);
  setText("detailLocation", character.location?.name);
  setText(
    "detailEpisodes",
    character.episode?.length ?? 0,
    "0"
  );

  setText(
    "detailCreated",
    character.created
      ? new Date(character.created).toLocaleDateString()
      : null
  );

  const statusBadge = document.getElementById("detailStatus");

  statusBadge.className =
    `status-badge ${(character.status || "unknown").toLowerCase()}`;
}

// LOAD EPISODE INFORMATION
async function loadEpisodes(episodeUrls, requestId) {
  const episodeList = document.getElementById("episodeList");
  episodeList.innerHTML = "";

  if (!episodeUrls.length) {
    episodeList.textContent = "No episode information available.";
    return;
  }

  // Load episodes in groups to avoid too many simultaneous requests
  const episodes = [];

  for (let i = 0; i < episodeUrls.length; i += 5) {
    if (requestId !== detailsRequestNumber) return;

    const batch = episodeUrls.slice(i, i + 5);

    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetch(url);

          if (!response.ok) return null;

          return await response.json();
        } catch {
          return null;
        }
      })
    );

    episodes.push(...results.filter(Boolean));
  }

  if (requestId !== detailsRequestNumber) return;

  if (episodes.length === 0) {
    episodeList.textContent =
      "Episode information is currently unavailable.";
    return;
  }

  episodes.forEach((episode) => {
    const item = document.createElement("div");
    item.className = "episode-item";

    const name = document.createElement("strong");
    name.textContent = episode.name || "Untitled Episode";

    const code = document.createElement("span");
    code.textContent =
      `${episode.episode || "Unknown"} • ${episode.air_date || "Unknown air date"}`;

    item.append(name, code);
    episodeList.appendChild(item);
  });

  if (episodes.length < episodeUrls.length) {
    const note = document.createElement("p");
    note.textContent =
      "Some episode information could not be loaded.";
    episodeList.appendChild(note);
  }
}

// DISPLAY DETAILS ERROR
function showDetailsError(message) {
  detailsLoading.style.display = "none";
  detailsError.hidden = false;
  detailsError.textContent = message;
}

// BACK TO COLLECTION
backButton.addEventListener("click", () => {
  // Invalidate any details requests still running
  detailsRequestNumber++;

  characterDetails.hidden = true;

  if (collectionSection) collectionSection.hidden = false;
  if (heroSection) heroSection.hidden = false;
  if (topbar) topbar.hidden = false;

  document.title = "Rift Archive | Rick and Morty Character Database";

  window.scrollTo({
    top: collectionScrollPosition,
    behavior: "instant"
  });
});

// PAGINATION
prevButton.addEventListener("click", () => {
  if (prevPageUrl) {
    loadCharacters(prevPageUrl);
  }
});

nextButton.addEventListener("click", () => {
  if (nextPageUrl) {
    loadCharacters(nextPageUrl);
  }
});
