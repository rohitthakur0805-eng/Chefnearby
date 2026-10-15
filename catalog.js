/* ChefNearby marketplace catalogue: cuisines, dishes, menus, services and markets. */
(function () {
'use strict';
const config=window.CHEFNEARME||{};
let client,cuisines=[],dishes=[],menus=[],menuDishes=[],services=[],categories=[];
const $=id=>document.getElementById(id);
const INDIA_CITIES=['Bengaluru','Delhi','Pune','Noida','Gurgaon','Hyderabad','Mumbai','Lucknow'];
const COUNTRIES=[['United States','🇺🇸'],['United Kingdom','🇬🇧'],['Canada','🇨🇦'],['Australia','🇦🇺'],['New Zealand','🇳🇿'],['United Arab Emirates','🇦🇪'],['Saudi Arabia','🇸🇦'],['Qatar','🇶🇦'],['Singapore','🇸🇬'],['Malaysia','🇲🇾'],['Germany','🇩🇪'],['France','🇫🇷'],['Italy','🇮🇹'],['Netherlands','🇳🇱'],['Ireland','🇮🇪']];
const FALLBACK_SERVICES=[['Party Chef','Events','🎉'],['Private Chef','Food','🍽️'],['Private Dining','Food','🥂'],['Home Cook','Home','🏠'],['Daily Cook','Home','🥗'],['Nearby Bartender','Events','🍸'],['Nearby Waiter','Events','🧑‍🍳'],['Nearby Babysitter','Home','🧸'],['Nearby Beautician','Personal Care','💄'],['Nearby Butler','Home','🛎️'],['Nearby Cleaner','Home','🧹'],['Nearby Decorator','Events','🎈'],['Nearby Kitchen Helper','Food','👩‍🍳']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=(r,keys)=>{for(const k of keys)if(r&&r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!=='')return r[k];return ''};
const label=r=>String(val(r,['name','dish_name','title','display_name','label','slug'])||'Untitled');
const active=r=>!(r&&(r.is_active===false||r.active===false||String(r.status||'').toLowerCase()==='inactive'));
const slugify=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function read(table){const {data,error}=await client.from(table).select('*').limit(1000);if(error){console.warn('[ChefNearby] '+table+': '+error.message);return {rows:[],error:error.message};}return {rows:Array.isArray(data)?data:[],error:null};}
function selectedCuisine(){const id=$('catalogCuisine')?.value;return cuisines.find(c=>String(c.id||c.slug||label(c))===String(id))||cuisines.find(c=>slugify(label(c))===String(id))||null;}
function dishBelongs(d,c){
 if(!c)return true;
 const id=val(d,['cuisine_id','cuisineId','cuisine_uuid']);
 if(id!=='')return String(id)===String(c.id);
 const name=val(d,['cuisine_slug','cuisine_name','cuisine']);
 if(name!=='')return [label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(name).toLowerCase());
 const cm=menus.filter(m=>{const mid=val(m,['cuisine_id','cuisineId']),mn=val(m,['cuisine_slug','cuisine_name','cuisine']);return(mid!==''&&String(mid)===String(c.id))||(mn!==''&&[label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(mn).toLowerCase()));}).map(m=>String(m.id));
 return cm.length>0&&menuDishes.some(md=>cm.includes(String(val(md,['menu_id','menuId'])))&&String(val(md,['dish_id','dishId']))===String(d.id));
}
function renderCuisineOptions(){
 const cat=$('catalogCuisine'),book=$('cuisine');
 if(cat){const old=cat.value;cat.innerHTML='<option value="">Choose a cuisine</option>'+cuisines.map(c=>'<option value="'+esc(c.id||c.slug||label(c))+'">'+esc(label(c))+'</option>').join('');if(old&&cuisines.some(c=>String(c.id||c.slug||label(c))===old))cat.value=old;else if(cuisines.length)cat.value=String(cuisines[0].id||cuisines[0].slug||label(cuisines[0]));}
 if(book){const old=book.value;book.innerHTML=cuisines.map(c=>'<option value="'+esc(label(c))+'">'+esc(label(c))+'</option>').join('');if(cuisines.some(c=>label(c)===old))book.value=old;else if(cat&&selectedCuisine())book.value=label(selectedCuisine());}
}
function renderCuisineCards(){
 const target=$('cuisineCards');if(!target)return;
 target.innerHTML=cuisines.map(c=>{
  const count=dishes.filter(d=>active(d)&&dishBelongs(d,c)).length, slug=String(val(c,['slug'])||slugify(label(c))), id=String(c.id||'');
  const icon=({'italian':'🍝','chinese':'🥡','japanese':'🍣','thai':'🍜','mexican':'🌮','continental':'🥘','north-indian':'🍛','south-indian':'🥞','pan-asian':'🍱','mediterranean':'🫒'})[slugify(label(c))]||'🍽️';
  const href='./cuisine.html?slug='+encodeURIComponent(slug)+'&id='+encodeURIComponent(id);
  return '<a class="service cuisine-tile" href="'+esc(href)+'" style="display:block;color:var(--ink)"><div class="icon">'+icon+'</div><h3>'+esc(label(c))+'</h3><p>'+count+' linked dishes</p><div class="price">Open cuisine & menu →</div></a>';
 }).join('');
}
function renderCatalogue(){
 const c=selectedCuisine(),search=($('dishSearch')?.value||'').trim().toLowerCase(),status=$('catalogStatus'),dt=$('catalogDishes'),mt=$('catalogMenus');if(!dt||!mt||!status)return;
 const ms=menus.filter(m=>active(m)&&(!c||String(val(m,['cuisine_id','cuisineId']))===String(c.id)||[label(c),val(c,['slug'])].some(x=>String(x||'').toLowerCase()===String(val(m,['cuisine_slug','cuisine_name','cuisine'])||'').toLowerCase()))).filter(m=>!search||[label(m),val(m,['description','slug'])].join(' ').toLowerCase().includes(search));
 const ds=dishes.filter(d=>active(d)&&dishBelongs(d,c)&&(!search||[label(d),val(d,['description','short_description','slug'])].join(' ').toLowerCase().includes(search)));
 if($('selectedCuisineHeading'))$('selectedCuisineHeading').textContent=c?label(c)+' — dishes & menus':'All dishes & menus';
 mt.innerHTML=ms.map(m=>{const n=menuDishes.filter(md=>String(val(md,['menu_id','menuId']))===String(m.id)).length;return '<a class="service" href="./menu.html?id='+encodeURIComponent(m.id||'')+'" style="display:block;color:var(--ink)"><div class="icon">📋</div><h3>'+esc(label(m))+'</h3><p>'+esc(val(m,['description','summary'])||n+' linked dishes')+'</p><div class="price">'+n+' menu items · Open menu →</div></a>';}).join('');
 dt.innerHTML=ds.map(d=>{const img=val(d,['image_url','image','photo_url','image_path']),price=val(d,['price','base_price','selling_price']);const href='./dish.html?id='+encodeURIComponent(d.id||'')+'&slug='+encodeURIComponent(val(d,['slug'])||slugify(label(d)));return '<a class="service dish-card" href="'+esc(href)+'" style="display:block;color:var(--ink)">'+(img?'<img src="'+esc(img)+'" alt="'+esc(label(d))+'" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:13px" onerror="this.style.display=\'none\'">':'<div class="icon">🍽️</div>')+'<h3>'+esc(label(d))+'</h3><p>'+esc(val(d,['description','short_description','details'])||val(d,['slug'])||'Open dish details, recipe and chef request.')+'</p>'+(price!==''?'<div class="price">₹'+esc(price)+'</div>':'')+'<div class="price">View recipe & details →</div></a>';}).join('');
 if(!cuisines.length)status.textContent='No cuisine rows readable. Check Supabase SELECT access for cuisines.';
 else if(!dishes.length)status.textContent=cuisines.length+' cuisines loaded, but dishes table returned no readable rows. Check dish data and SELECT policies.';
 else if(c&&!ds.length)status.textContent='No dishes linked to '+label(c)+' yet. Check dishes.cuisine_id or menu_dishes → menus cuisine links.';
 else status.textContent=(c?label(c)+': ':'Catalogue: ')+ds.length+' dishes and '+ms.length+' menus.';
 if(!ds.length)dt.innerHTML='<div class="seoCard" style="grid-column:1/-1"><h3>No linked dishes found</h3><p>The cuisine page works, but database records need correct cuisine relationships before dishes can display.</p></div>';
 if(!ms.length)mt.innerHTML='<div class="seoCard" style="grid-column:1/-1"><h3>No menus linked yet</h3><p>Menus appear after menu records are linked to this cuisine and its dishes.</p></div>';
}
function renderServices(){
 const target=$('serviceCards'),status=$('serviceStatus');if(!target)return;
 const rows=services.length?services.filter(active).map(s=>({name:label(s),group:val(s,['category_group','group','category'])||'Services',slug:val(s,['slug'])})):FALLBACK_SERVICES.map(s=>({name:s[0],group:s[1],icon:s[2]}));
 const icons={bartender:'🍸',waiter:'🧑‍🍳',babysitter:'🧸',beautician:'💄',butler:'🛎️',cleaner:'🧹',decorator:'🎈','kitchen-helper':'👩‍🍳','party-chef':'🎉','private-chef':'🍽️','private-dining':'🥂','home-cook':'🏠','daily-cook':'🥗'};
 target.innerHTML=rows.map(s=>{const name=s.name||'Service',icon=s.icon||icons[slugify(name)]||'✨',displayName=String(s.slug||'').startsWith('nearby-')&&!/^nearby\s/i.test(name)?'Nearby '+name:name;const serviceSlug=slugify(s.slug||name).replace(/^nearby-/,'');const href='./services/'+serviceSlug+'-bengaluru.html';return '<a class="service" href="'+esc(href)+'" style="display:block;color:var(--ink)"><div class="icon">'+icon+'</div><h3>'+esc(displayName)+'</h3><p>'+esc(s.group||'Home & lifestyle service')+'</p><div class="price">Explore service →</div></a>';}).join('');
 target.querySelectorAll('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{const service=btn.dataset.service,sel=$('bservice');if(sel&&!Array.from(sel.options).some(o=>o.value===service)){const opt=document.createElement('option');opt.value=service;opt.textContent=service;sel.appendChild(opt);}if(sel)sel.value=service;$('book')?.scrollIntoView({behavior:'smooth'});}));
 if(status)status.textContent=services.length?'Services loaded from the live database.':'Showing requested service categories while database rows/permissions are verified.';
}
function renderMarkets(){
 const cities=$('cityCards'),countries=$('countryCards');
 if(cities)cities.innerHTML=INDIA_CITIES.map((c,i)=>'<button class="service" type="button" data-city="'+esc(c)+'" style="text-align:left;cursor:pointer;color:var(--ink)"><div class="icon">📍</div><h3>'+esc(c)+'</h3><p>'+(i===0?'Primary city':'India expansion city')+'</p><div class="price">Request service →</div></button>').join('');
 cities?.querySelectorAll('[data-city]').forEach(btn=>btn.addEventListener('click',()=>{if($('loc'))$('loc').value=btn.dataset.city;if($('bookingCity'))$('bookingCity').value=btn.dataset.city;$('book')?.scrollIntoView({behavior:'smooth'});}));
 if(countries) countries.innerHTML=COUNTRIES.map(c=>'<article class="service"><div class="icon">'+c[1]+'</div><h3>'+esc(c[0])+'</h3><p>International expansion market</p><div class="price">Launch planning</div></article>').join('');
}
async function init(){
 const status=$('catalogStatus');
 if(!window.supabase||!config.supabaseUrl||!config.supabasePublishableKey){if(status)status.textContent='Supabase catalogue connection is not configured.';renderMarkets();renderServices();return;}
 client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);
 const [cr,dr,mr,mdr,sr,scr]=await Promise.all(['cuisines','dishes','menus','menu_dishes','services','service_categories'].map(read));
 cuisines=cr.rows.filter(active).sort((a,b)=>label(a).localeCompare(label(b)));dishes=dr.rows;menus=mr.rows;menuDishes=mdr.rows;services=sr.rows.filter(active);categories=scr.rows.filter(active);if(!services.length&&categories.length)services=categories;
 renderCuisineOptions();
 const requested=new URLSearchParams(location.search).get('cuisine');
 if(requested){const chosen=cuisines.find(x=>slugify(val(x,['slug'])||label(x))===requested.toLowerCase()||label(x).toLowerCase()===requested.toLowerCase());if(chosen){if($('catalogCuisine'))$('catalogCuisine').value=String(chosen.id||chosen.slug||label(chosen));if($('cuisine'))$('cuisine').value=label(chosen);}}
 renderCuisineCards();renderCatalogue();renderServices();renderMarkets();
 $('catalogCuisine')?.addEventListener('change',()=>{const c=selectedCuisine();if(c&&$('cuisine'))$('cuisine').value=label(c);renderCatalogue();});
 $('dishSearch')?.addEventListener('input',renderCatalogue);
 $('cuisine')?.addEventListener('change',()=>{const c=cuisines.find(x=>label(x).toLowerCase()===$('cuisine').value.toLowerCase());if(c&&$('catalogCuisine')){$('catalogCuisine').value=String(c.id||c.slug||label(c));renderCatalogue();}});
}
window.ChefNearbyCatalog={selectCuisine(value){if($('catalogCuisine'))$('catalogCuisine').value=String(value);renderCatalogue();}};
document.addEventListener('DOMContentLoaded',init);
})();