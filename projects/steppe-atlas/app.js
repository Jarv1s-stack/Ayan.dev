const routes = [
  { id: 'charyn', name: 'The red canyon road', region: 'south', place: 'Almaty region', days: 2, distance: 418, note: 'Canyon walls at first light, a long lunch beside the river, then a quiet night near the lakes.', stop: 'Charyn · Kolsai' },
  { id: 'alatau', name: 'Into the high valley', region: 'south', place: 'Almaty region', days: 1, distance: 146, note: 'A day among spruce forests, cold streams and the first clear view of the peaks.', stop: 'Turgen · Assy' },
  { id: 'mangystau', name: 'The white cliffs', region: 'west', place: 'Mangystau', days: 4, distance: 620, note: 'Wind-shaped land, chalk plateaus and nights quiet enough to hear the steppe.', stop: 'Bozjyra · Sherkala' },
  { id: 'altyn', name: 'Where the river bends', region: 'east', place: 'East Kazakhstan', days: 3, distance: 352, note: 'Pine-scented paths, a slow river crossing and a small village kitchen.', stop: 'Katон · Bukhtarma' },
  { id: 'burabay', name: 'Pines above the lake', region: 'east', place: 'Akmola', days: 2, distance: 290, note: 'Granite ridges rise above blue water, with time for a trail before sunset.', stop: 'Burabay · Okzhetpes' },
  { id: 'turkistan', name: 'The old silk road', region: 'south', place: 'Turkistan region', days: 2, distance: 310, note: 'Courtyard shade, tiled domes and a short detour through quiet market streets.', stop: 'Otrar · Turkistan' }
];
const list = document.querySelector('#route-list');
const itineraryItems = document.querySelector('#itinerary-items');
const duration = document.querySelector('#duration');
const selected = new Map();
let activeRegion = 'all';

function renderRoutes() {
  const visible = routes.filter(route => (activeRegion === 'all' || route.region === activeRegion) && (duration.value === 'all' || route.days <= Number(duration.value)));
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'no-routes';
    empty.textContent = 'No routes match that pace. Try another region or time window.';
    list.append(empty);
    return;
  }
  for (const route of visible) {
    const card = document.createElement('article');
    card.className = 'route-card';
    const top = document.createElement('div');
    top.className = 'route-card-top';
    const place = document.createElement('span');
    place.textContent = route.place;
    const durationLabel = document.createElement('span');
    durationLabel.textContent = `${route.days} ${route.days === 1 ? 'DAY' : 'DAYS'}`;
    top.append(place, durationLabel);
    const title = document.createElement('h3');
    title.textContent = route.name;
    const note = document.createElement('p');
    note.textContent = route.note;
    const bottom = document.createElement('div');
    bottom.className = 'route-card-bottom';
    const stops = document.createElement('span');
    stops.textContent = route.stop;
    const add = document.createElement('button');
    add.type = 'button';
    add.setAttribute('aria-pressed', String(selected.has(route.id)));
    add.textContent = selected.has(route.id) ? 'Added' : `Add stop · ${route.distance} km`;
    add.addEventListener('click', () => {
      if (selected.has(route.id)) selected.delete(route.id);
      else selected.set(route.id, route);
      renderRoutes();
      renderItinerary();
    });
    bottom.append(stops, add);
    card.append(top, title, note, bottom);
    list.append(card);
  }
}

function renderItinerary() {
  const stops = [...selected.values()];
  document.querySelector('#route-count').textContent = String(stops.length);
  document.querySelector('#itinerary-empty').hidden = stops.length > 0;
  document.querySelector('#itinerary-title').textContent = stops.length ? `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'} to remember` : 'A map, still open';
  document.querySelector('#itinerary-distance').textContent = `${stops.reduce((total, stop) => total + stop.distance, 0)} km`;
  itineraryItems.replaceChildren();
  for (const stop of stops) {
    const item = document.createElement('li');
    item.textContent = `${stop.stop} · ${stop.days} ${stop.days === 1 ? 'day' : 'days'}`;
    itineraryItems.append(item);
  }
}

document.querySelectorAll('[data-region]').forEach(button => button.addEventListener('click', () => {
  activeRegion = button.dataset.region;
  document.querySelectorAll('[data-region]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  renderRoutes();
}));
duration.addEventListener('change', renderRoutes);
document.querySelector('#clear-route').addEventListener('click', () => {
  selected.clear();
  renderRoutes();
  renderItinerary();
});
renderRoutes();
