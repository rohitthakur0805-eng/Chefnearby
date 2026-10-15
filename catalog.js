/* Live cuisine, dish and menu catalogue for ChefNearby. */
(function () {
  'use strict';
  const config = window.CHEFNEARME || {};
  let client;
  let cuisines = [], dishes = [], menus = [], menuDishes = [];
  const $ = id => document.getElementById(id);
  const first = (obj, keys) => {
    for (const key of keys) if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
    return '';
  };
  const text = (value, fallback) => String(value || fallback || '');
  function active(row) {
    return !(row && (row.is_active === false || row.active === false || row.status === 'inactive'));
  }
  function title(row) {
    return text(first(row, ['name','dish_name','title','display_name','label','slug']), 'Untitled item');
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function rowCuisineId(row) {
    return first(row, ['cuisine_id','cuisineId','cuisine_uuid']);
  }
  function selectedCuisine() {
    const id = $('catalogCuisine') && $('catalogCuisine').value;
    return cuisines.find(c => String(c.id) === String(id)) || cuisines.find(c => String(first(c,['slug'])) === String(id)) || null;
  }
  function renderCuisineOptions() {
    const catalog = $('catalogCuisine'), booking = $('cuisine');
    if (!catalog || !booking) return;
    const previous = catalog.value;
    catalog.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = cuisines.length ? 'Choose a cuisine' : 'No cuisines available';
    catalog.appendChild(placeholder);
    cuisines.forEach(c => {
      const opt = document.createElement('option');
      opt.value = String(c.id || c.slug || title(c));
      opt.textContent = title(c);
      catalog.appendChild(opt);
    });
    if (previous && Array.from(catalog.options).some(o => o.value === previous)) catalog.value = previous;
    if (!catalog.value && cuisines.length) catalog.selectedIndex = 1;
    const chosen = catalog.value;
    booking.innerHTML = '';
    cuisines.forEach(c => {
      const opt = document.createElement('option');
      opt.value = title(c);
      opt.textContent = title(c);
      booking.appendChild(opt);
    });
    const current = selectedCuisine();
    if (current) booking.value = title(current);
    else if (chosen) {
      const c = cuisines.find(x => String(x.id || x.slug || title(x)) === chosen);
      if (c) booking.value = title(c);
    }
  }
  function cuisineMatches(row, cuisine) {
    if (!cuisine) return true;
    const id = rowCuisineId(row);
    if (id !== '') return String(id) === String(cuisine.id);
    const slug = first(row, ['cuisine_slug','cuisine_name','cuisine']);
    if (slug !== '') return String(slug).toLowerCase() === String(first(cuisine,['slug','name'])).toLowerCase()
      || String(slug).toLowerCase() === String(title(cuisine)).toLowerCase();
    return true;
  }
  function render() {
    const cuisine = selectedCuisine();
    const search = ($('dishSearch')?.value || '').trim().toLowerCase();
    const dishArea = $('catalogDishes'), menuArea = $('catalogMenus'), status = $('catalogStatus');
    if (!dishArea || !menuArea || !status) return;
    const filteredDishes = dishes.filter(d => active(d) && cuisineMatches(d, cuisine) &&
      (!search || [title(d), first(d,['description','short_description','slug'])].join(' ').toLowerCase().includes(search)));
    const linkedMenuIds = new Set(menuDishes.filter(md => filteredDishes.some(d => String(d.id) === String(first(md,['dish_id','dishId']))))
      .map(md => String(first(md,['menu_id','menuId']))));
    const filteredMenus = menus.filter(m => active(m) && (!cuisine || String(first(m,['cuisine_id','cuisineId'])) === String(cuisine.id) ||
      String(first(m,['cuisine_slug','cuisine_name'])) === String(first(cuisine,['slug','name'])) ||
      linkedMenuIds.has(String(m.id))));
    menuArea.innerHTML = filteredMenus.map(m => {
      const desc = first(m,['description','details','summary']);
      const count = menuDishes.filter(md => String(first(md,['menu_id','menuId'])) === String(m.id)).length;
      return '<article class="service"><div class="icon">📋</div><h3>'+escapeHtml(title(m))+'</h3><p>'+escapeHtml(desc || (count ? count+' dishes in this menu' : 'ChefNearby menu'))+'</p></article>';
    }).join('');
    dishArea.innerHTML = filteredDishes.map(d => {
      const name = title(d), desc = first(d,['description','short_description','details']);
      const image = first(d,['image_url','image','photo_url','image_path']);
      const price = first(d,['price','base_price','selling_price']);
      return '<article class="service">'+(image ? '<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(name)+'" loading="lazy" style="width:100%;height:145px;object-fit:cover;border-radius:13px" onerror="this.style.display=\'none\'">' : '<div class="icon">🍽️</div>')+
        '<h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(desc || first(d,['slug']) || 'Dish details will be added soon.')+'</p>'+(price !== '' ? '<div class="price">₹'+escapeHtml(price)+'</div>' : '')+'</article>';
    }).join('');
    if (!cuisines.length) status.textContent = 'Cuisine data could not be loaded. Check that the public/anon role has SELECT access to the cuisines table.';
    else if (!dishes.length) status.textContent = cuisines.length+' cuisines loaded, but no dishes were returned. Check dishes table data and its SELECT policy in Supabase.';
    else status.textContent = (cuisine ? title(cuisine)+': ' : 'All cuisines: ')+filteredDishes.length+' dishes • '+filteredMenus.length+' menus loaded.';
    if (!filteredDishes.length && dishes.length) dishArea.innerHTML = '<div class="seoCard" style="grid-column:1/-1"><h3>No dishes found for this filter</h3><p>Try another cuisine or clear the dish search. If the catalogue is still empty, check that each dish is linked to the correct cuisine in Supabase.</p></div>';
    if (!filteredMenus.length) menuArea.innerHTML = '<div class="seoCard" style="grid-column:1/-1"><h3>No menus linked yet</h3><p>Menus will appear here when menu records are linked to this cuisine and its dishes in Supabase.</p></div>';
  }
  async function loadTable(table) {
    const { data, error } = await client.from(table).select('*').limit(1000);
    if (error) {
      console.warn('ChefNearby catalogue: '+table+' could not be read:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }
  async function init() {
    const status = $('catalogStatus');
    if (!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) {
      if (status) status.textContent = 'Catalogue connection is not configured. Refresh the page or contact the site admin.';
      return;
    }
    try {
      client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
      const results = await Promise.all([
        loadTable('cuisines'), loadTable('dishes'), loadTable('menus'), loadTable('menu_dishes')
      ]);
      cuisines = results[0].filter(active).sort((a,b) => title(a).localeCompare(title(b)));
      dishes = results[1];
      menus = results[2];
      menuDishes = results[3];
      renderCuisineOptions();
      render();
      $('catalogCuisine')?.addEventListener('change', () => {
        const chosen = selectedCuisine();
        if (chosen && $('cuisine')) $('cuisine').value = title(chosen);
        render();
      });
      $('dishSearch')?.addEventListener('input', render);
      $('cuisine')?.addEventListener('change', () => {
        const match = cuisines.find(c => title(c).toLowerCase() === $('cuisine').value.toLowerCase());
        if (match && $('catalogCuisine')) {
          $('catalogCuisine').value = String(match.id || match.slug || title(match));
          render();
        }
      });
    } catch (error) {
      console.error('ChefNearby catalogue failed:', error);
      if (status) status.textContent = 'Could not load the catalogue. Check Supabase connection and table permissions.';
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();