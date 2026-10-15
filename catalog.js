/* ChefNearby marketplace catalogue: cuisines, dishes, menus, services and markets. */
(function () {
  'use strict';
  const config = window.CHEFNEARME || {};
  let client, cuisines=[], dishes=[], menus=[], menuDishes=[], services=[], categories=[];
  const $ = id => document.getElementById(id);
  const INDIA_CITIES = ['Bengaluru','Delhi','Pune','Noida','Gurgaon','Hyderabad','Mumbai','Lucknow'];
  const COUNTRIES = [
    ['United States','🇺🇸'],['United Kingdom','🇬🇧'],['Canada','🇨🇦'],['Australia','🇦🇺'],
    ['New Zealand','🇳🇿'],['United Arab Emirates','🇦🇪'],['Saudi Arabia','🇸🇦'],['Qatar','🇶🇦'],
    ['Singapore','🇸🇬'],['Malaysia','🇲🇾'],['Germany','🇩🇪'],['France','🇫🇷'],
    ['Italy','🇮🇹'],['Netherlands','🇳🇱'],['Ireland','🇮🇪']
  ];
  const FALLBACK_SERVICES = [
    ['Party Chef','Events','🎉'],['Private Chef','Food','🍽️'],['Private Dining','Food','🥂'],
    ['Home Cook','Home','🏠'],['Daily Cook','Home','🥗'],['Bartender','Events','🍸'],
    ['Waiter','Events','🧑‍🍳'],['Babysitter','Home','🧸'],['Beautician','Personal Care','💄'],
    ['Butler','Home','🛎️'],['Cleaner','Home','🧹'],['Decorator','Events','🎈'],
    ['Kitchen Helper','Food','👩‍🍳']
  ];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const val = (r, keys) => { for (const k of keys) if (r && r[k] !== undefined && r[k] !== null && String(r[k]).trim()!=='') return r[k]; return ''; };
  const label = r => String(val(r,['name','dish_name','title','display_name','label','slug']) || 'Untitled');
  const isActive = r => !(r && (r.is_active === false || r.active === false || String(r.status||'').toLowerCase()==='inactive'));
  const slugify = s => String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  async function read(table) {
    const {data,error}=await client.from(table).select('*').limit(1000);
    if(error){ console.warn('[ChefNearby] Could not read '+table+': '+error.message); return {rows:[],error:error.message}; }
    return {rows:Array.isArray(data)?data:[],error:null};
  }
  function selectedCuisine() {
    const id=$('catalogCuisine')?.value;
    return cuisines.find(c=>String(c.id||c.slug||label(c))===String(id)) || cuisines.find(c=>slugify(label(c))===String(id)) || null;
  }
  function dishBelongsToCuisine(d,c) {
    if(!c) return true;
    const directId=val(d,['cuisine_id','cuisineId','cuisine_uuid']);
    if(directId!=='') return String(directId)===String(c.id);
    const directName=val(d,['cuisine_slug','cuisine_name','cuisine']);
    if(directName!=='') return [label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(directName).toLowerCase());
    const cuisineMenus=menus.filter(m=>{
      const mid=val(m,['cuisine_id','cuisineId']);
      const mname=val(m,['cuisine_slug','cuisine_name','cuisine']);
      return (mid!=='' && String(mid)===String(c.id)) || (mname!=='' && [label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(mname).toLowerCase()));
    }).map(m=>String(m.id));
    if(cuisineMenus.length) return menuDishes.some(md=>cuisineMenus.includes(String(val(md,['menu_id','menuId']))) && String(val(md,['dish_id','dishId']))===String(d.id));
    // If this dataset has no cuisine relation at all, don't pretend every dish belongs to every cuisine.
    return false;
  }
  function renderCuisineOptions() {
    const catalog=$('catalogCuisine'), booking=$('cuisine');
    if(catalog){
      const old=catalog.value;
      catalog.innerHTML='<option value="">Choose a cuisine</option>'+cuisines.map(c=>'<option value="'+esc(c.id||c.slug||label(c))+'">'+esc(label(c))+'</option>').join('');
      if(old && cuisines.some(c=>String(c.id||c.slug||label(c))===old)) catalog.value=old;
      else if(cuisines.length) catalog.value=String(cuisines[0].id||cuisines[0].slug||label(cuisines[0]));
    }
    if(booking){
      const old=booking.value;
      booking.innerHTML=cuisines.map(c=>'<option value="'+esc(label(c))+'">'+esc(label(c))+'</option>').join('');
      if(cuisines.some(c=>label(c)===old)) booking.value=old;
      else if(catalog && selectedCuisine()) booking.value=label(selectedCuisine());
    }
  }
  function renderCuisineCards() {
    const target=$('cuisineCards'); if(!target) return;
    target.innerHTML=cuisines.map(c=>{
      const count=dishes.filter(d=>isActive(d)&&dishBelongsToCuisine(d,c)).length;
      const slug=String(val(c,['slug'])||slugify(label(c)));
      const id=String(c.id||'');
      const icon=({'italian':'🍝','chinese':'🥡','japanese':'🍣','thai':'🍜','mexican':'🌮','continental':'🥘','north-indian':'🍛','south-indian':'🥞','pan-asian':'🍱','mediterranean':'🫒'})[slugify(label(c))]||'🍽️';
      const href='./cuisine.html?slug='+encodeURIComponent(slug)+'&id='+encodeURIComponent(id);
      return '<a class="service cuisine-tile" href="'+esc(href)+'" style="display:block;color:var(--ink)"><div class="icon">'+icon+'</div><h3>'+esc(label(c))+'</h3><p>'+count+' linked dishes</p><div class="price">Open cuisine & menu →</div></a>';
    }).join('');
  }
  function renderCatalogue() {
    const c=selectedCuisine(), search=($('dishSearch')?.value||'').trim().toLowerCase();
    const status=$('catalogStatus'), dishTarget=$('catalogDishes'), menuTarget=$('catalogMenus');
    if(!dishTarget||!menuTarget||!status) return;
    const matchingMenus=menus.filter(m=>isActive(m) && (!c || String(val(m,['cuisine_id','cuisineId']))===String(c.id) ||
      [label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(val(m,['cuisine_slug','cuisine_name','cuisine'])||'').toLowerCase())));
    const ds=dishes.filter(d=>isActive(d)&&dishBelongsToCuisine(d,c)&&(!search||[label(d),val(d,['description','short_description','slug'])].join(' ').toLowerCase().includes(search)));
    const ms=matchingMenus.filter(m=>!search||[label(m),val(m,['description','slug'])].join(' ').toLowerCase().includes(search));
    if($('selectedCuisineHeading')) $('selectedCuisineHeading').textContent=c ? label(c)+' — dishes & menus' : 'All dishes & menus';
    menuTarget.innerHTML=ms.map(m=>{
      const count=menuDishes.filter(md=>String(val(md,['menu_id','menuId']))===String(m.id)).length;
      return '<article class="service"><div class="icon">📋</div><h3>'+esc(label(m))+'</h3><p>'+esc(val(m,['description','summary'])||count+' linked dishes')+'</p><div class="price">'+count+' menu items</div></article>';
    }).join('');
    dishTarget.innerHTML=ds.map(d=>{
      const img=val(d,['image_url','image','photo_url','image_path']), desc=val(d,['description','short_description','details']), price=val(d,['price','base_price','selling_price']);
      return '<article class="service">'+(img?'<img src="'+esc(img)+'" alt="'+esc(label(d))+'" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:13px" onerror="this.style.display=\'none\'">':'<div class="icon">🍽️</div>')+'<h3>'+esc(label(d))+'</h3><p>'+esc(desc||val(d,['slug'])||'Dish details coming soon.')+'</p>'+(price!==''?'<div class="price">₹'+esc(price)+'</div>':'')+'</article>';
    }).join('');
    if(!cuisines.length) status.textContent='No cuisine rows were readable. Check Supabase SELECT grants/RLS for cuisines.';
    else if(!dishes.length) status.textContent=cuisines.length+' cuisines loaded, but the dishes table returned no readable rows. Check dishes data and SELECT policies.';
    else if(c && !ds.length) status.textContent='Cuisine loaded. No dishes are linked to '+label(c)+' yet; check dishes.cuisine_id or menu_dishes → menus cuisine links.';
    else status.textContent=(c?label(c)+': ':'Catalogue: ')+ds.length+' dishes and '+ms.length+' menus.';
    if(!ds.length) dishTarget.innerHTML='<div class="seoCard" style="grid-column:1/-1"><h3>No linked dishes found</h3><p>The cuisine card is working, but the database must link dishes to this cuisine. We should verify the live cuisine/dish columns before adding data so we do not corrupt existing records.</p></div>';
    if(!ms.length) menuTarget.innerHTML='<div class="seoCard" style="grid-column:1/-1"><h3>No menus linked yet</h3><p>Menu records will appear once menus are linked to this cuisine and its dishes.</p></div>';
  }
  function renderServices() {
    const target=$('serviceCards'), status=$('serviceStatus'); if(!target) return;
    const rows=services.length?services.filter(isActive).map(s=>({name:label(s),group:val(s,['category_group','group','category'])||'Services',slug:val(s,['slug'])})):
      FALLBACK_SERVICES.map(s=>({name:s[0],group:s[1],icon:s[2]}));
    const icons={bartender:'🍸',waiter:'🧑‍🍳',babysitter:'🧸',beautician:'💄',butler:'🛎️',cleaner:'🧹',decorator:'🎈','kitchen-helper':'👩‍🍳','party-chef':'🎉','private-chef':'🍽️','private-dining':'🥂','home-cook':'🏠','daily-cook':'🥗'};
    target.innerHTML=rows.map(s=>{
      const name=s.name||'Service', icon=s.icon||icons[slugify(name)]||'✨';
      return '<button type="button" class="service" data-service="'+esc(name)+'" style="text-align:left;width:100%;cursor:pointer;color:var(--ink)"><div class="icon">'+icon+'</div><h3>'+esc(name.replace(/^Nearby\s+/i,''))+'</h3><p>'+esc(s.group||'Home & lifestyle service')+'</p><div class="price">Request this service →</div></button>';
    }).join('');
    target.querySelectorAll('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{
      const service=btn.dataset.service;
      const sel=$('bservice');
      if(sel && !Array.from(sel.options).some(o=>o.value===service)){const opt=document.createElement('option');opt.value=service;opt.textContent=service;sel.appendChild(opt);}
      if(sel) sel.value=service;
      $('book')?.scrollIntoView({behavior:'smooth'});
    }));
    if(status) status.textContent=services.length?'Services loaded from the live database.':'Showing the requested service catalogue while service table permissions/data are verified.';
  }
  function renderMarkets() {
    const cities=$('cityCards'), countries=$('countryCards');
    if(cities) cities.innerHTML=INDIA_CITIES.map((c,i)=>'<button class="service" type="button" data-city="'+esc(c)+'" style="text-align:left;cursor:pointer;color:var(--ink)"><div class="icon">📍</div><h3>'+esc(c)+'</h3><p>'+(i===0?'Current primary city':'India expansion city')+'</p><div class="price">Request service →</div></button>').join('');
    cities?.querySelectorAll('[data-city]').forEach(btn=>btn.addEventListener('click',()=>{
      if($('loc')) $('loc').value=btn.dataset.city;
      if($('bookingCity')) $('bookingCity').value=btn.dataset.city;
      $('book')?.scrollIntoView({behavior:'smooth'});
    }));
    if(countries) countries.innerHTML=COUNTRIES.map(c=>'<article class="service"><div class="icon">'+c[1]+'</div><h3>'+esc(c[0])+'</h3><p>International expansion market</p><div class="price">Launch planning</div></article>').join('');
  }
  async function init() {
    const status=$('catalogStatus');
    if(!window.supabase||!config.supabaseUrl||!config.supabasePublishableKey) {
      if(status) status.textContent='Supabase catalogue connection is not configured.';
      renderMarkets(); renderServices(); return;
    }
    client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);
    const [c,d,m,md,s,sc]=await Promise.all(['cuisines','dishes','menus','menu_dishes','services','service_categories'].map(read));
    cuisines=c.rows.filter(isActive).sort((a,b)=>label(a).localeCompare(label(b)));
    dishes=d.rows; menus=m.rows; menuDishes=md.rows;
    services=s.rows.filter(isActive); categories=sc.rows.filter(isActive);
    if(!services.length && categories.length) services=categories;
    renderCuisineOptions();
    const requestedCuisine=new URLSearchParams(location.search).get('cuisine');
    if(requestedCuisine){
      const chosen=cuisines.find(x=>slugify(val(x,['slug'])||label(x))===requestedCuisine.toLowerCase()||label(x).toLowerCase()===requestedCuisine.toLowerCase());
      if(chosen){if($('catalogCuisine'))$('catalogCuisine').value=String(chosen.id||chosen.slug||label(chosen));if($('cuisine'))$('cuisine').value=label(chosen);}
    }
    renderCuisineCards(); renderCatalogue(); renderServices(); renderMarkets();
    $('catalogCuisine')?.addEventListener('change',()=>{const c=selectedCuisine();if(c&&$('cuisine'))$('cuisine').value=label(c);renderCatalogue();});
    $('dishSearch')?.addEventListener('input',renderCatalogue);
    $('cuisine')?.addEventListener('change',()=>{const c=cuisines.find(x=>label(x).toLowerCase()===$('cuisine').value.toLowerCase());if(c&&$('catalogCuisine')){$('catalogCuisine').value=String(c.id||c.slug||label(c));renderCatalogue();}});
  }
  window.ChefNearbyCatalog={selectCuisine(value){if($('catalogCuisine'))$('catalogCuisine').value=String(value);renderCatalogue();}};
  document.addEventListener('DOMContentLoaded',init);
})();