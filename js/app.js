(() => {
  const $ = (id) => document.getElementById(id);
  const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n)||0);
  const DEMO_USERS = { carlosjimenezcn: '216267899', admin: 'corona-26', ventas: 'brujita-26' };
  const keys = {sales:'cava_sales_v1', recipes:'cava_recipes_v1'};
  let currentUser = '', activeCategory = 'Todos', cart = [], sales = [];
  let ingredients = [{name:'Leche',cost:2},{name:'Café',cost:4},{name:'Vaso térmico',cost:2},{name:'Otros insumos',cost:1.5}];
  try { sales = JSON.parse(localStorage.getItem(keys.sales) || '[]'); } catch { sales=[]; }

  $('today-label').textContent = new Date().toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  $('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const username = $('username').value.trim().toLowerCase(), password = $('password').value;
    if (DEMO_USERS[username] === password) {
      currentUser = username; $('current-user').textContent = username;
      $('login-error').textContent = ''; $('login-screen').classList.add('hidden'); $('app').classList.remove('hidden');
      renderProducts(); renderHistory(); updateSummary(); renderIngredients(); updateCostResults();
    } else $('login-error').textContent = 'Usuario o contraseña incorrectos.';
  });
  $('logout-button').addEventListener('click', () => {cart=[]; $('app').classList.add('hidden'); $('login-screen').classList.remove('hidden'); $('password').value='';});
  document.querySelectorAll('.nav-link[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-link[data-view]').forEach(b=>b.classList.toggle('active',b===btn));
    const costs = btn.dataset.view === 'costs';
    $('pos-view').classList.toggle('hidden',costs); $('costs-view').classList.toggle('hidden',!costs);
    $('page-title').textContent = costs ? 'Costos de productos' : 'Punto de venta';
  }));
  function renderFilters(){
    const categories = ['Todos', ...new Set(window.CAVA_MENU.map(p=>p.category))];
    $('category-filters').innerHTML = categories.map(c=>`<button class="category-button ${c===activeCategory?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
    $('category-filters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.category;renderProducts();}));
  }
  function renderProducts(){
    renderFilters();
    const q=$('product-search').value.trim().toLocaleLowerCase('es-MX');
    const items=window.CAVA_MENU.filter(p=>(activeCategory==='Todos'||p.category===activeCategory)&&p.name.toLocaleLowerCase('es-MX').includes(q));
    $('product-grid').innerHTML=items.map(p=>`<button class="product-card" data-name="${esc(p.name)}"><span><span class="product-name">${esc(p.name)}</span><span class="product-category">${esc(p.category)}</span></span><span class="product-price">${money(p.price)}</span><span class="add-symbol">＋</span></button>`).join('') || '<p class="muted">No encontramos productos con esa búsqueda.</p>';
    $('product-grid').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const p=window.CAVA_MENU.find(x=>x.name===b.dataset.name);const found=cart.find(x=>x.name===p.name);if(found)found.qty++;else cart.push({...p,qty:1});renderCart();}));
    $('menu-count').textContent=window.CAVA_MENU.length;
  }
  $('product-search').addEventListener('input',renderProducts);
  function renderCart(){
    const holder=$('cart-items');
    if(!cart.length){holder.className='cart-items empty-cart';holder.innerHTML='<div class="empty-symbol">＋</div><strong>Tu cuenta está vacía</strong><span>Agrega productos del menú para comenzar.</span>';}
    else {holder.className='cart-items';holder.innerHTML=cart.map((p,i)=>`<div class="cart-row"><div><strong>${esc(p.name)}</strong><small>${money(p.price)} c/u</small><div class="cart-actions"><button class="qty-btn" data-action="minus" data-index="${i}">−</button><span class="qty">${p.qty}</span><button class="qty-btn" data-action="plus" data-index="${i}">+</button><button class="qty-btn" data-action="remove" data-index="${i}" aria-label="Eliminar">×</button></div></div><span class="cart-line-price">${money(p.price*p.qty)}</span></div>`).join('');}
    holder.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.index),a=b.dataset.action;if(a==='plus')cart[i].qty++;if(a==='minus')cart[i].qty--;if(a==='remove'||cart[i].qty<=0)cart.splice(i,1);renderCart();}));
    $('cart-total').textContent=money(cart.reduce((s,p)=>s+p.price*p.qty,0));$('complete-sale').disabled=!cart.length;
  }
  $('clear-cart').addEventListener('click',()=>{cart=[];renderCart();});
  $('complete-sale').addEventListener('click',()=>{
    if(!cart.length)return;
    const sale={id:Date.now(),date:new Date().toISOString(),user:currentUser,channel:$('sale-channel').value,payment:$('payment-method').value,items:cart.map(p=>({...p})),total:cart.reduce((s,p)=>s+p.price*p.qty,0)};
    sales.unshift(sale);localStorage.setItem(keys.sales,JSON.stringify(sales));cart=[];renderCart();renderHistory();updateSummary();toast('Venta registrada en este navegador.');
  });
  function renderHistory(){
    $('sales-history').innerHTML=sales.slice(0,12).map(s=>`<tr><td>${new Date(s.date).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</td><td>${esc(s.user)}</td><td>${s.items.map(i=>`${esc(i.name)} ×${i.qty}`).join(', ')}</td><td>${esc(s.channel)}</td><td>${esc(s.payment)}</td><td class="align-right"><strong>${money(s.total)}</strong></td></tr>`).join('');
    $('no-sales').classList.toggle('hidden',sales.length>0);
  }
  function updateSummary(){
    const today=new Date().toDateString(), todays=sales.filter(s=>new Date(s.date).toDateString()===today);
    $('today-sales').textContent=money(todays.reduce((s,x)=>s+x.total,0));$('today-orders').textContent=todays.length;
  }
  $('export-csv').addEventListener('click',()=>{
    const rows=[['id','fecha','usuario','categoria','producto','cantidad','precio_unitario','importe','canal','metodo_pago']];
    sales.forEach(s=>s.items.forEach(i=>{const product=window.CAVA_MENU.find(p=>p.name===i.name);rows.push([s.id,s.date,s.user,product?.category||'',i.name,i.qty,i.price,(i.qty*i.price).toFixed(2),s.channel,s.payment]);}));
    const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cava-ventas-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  });
  $('cost-product').innerHTML=window.CAVA_MENU.map((p,i)=>`<option value="${i}">${esc(p.name)} · ${money(p.price)}</option>`).join('');
  $('cost-product').addEventListener('change',()=>{const p=window.CAVA_MENU[Number($('cost-product').value)];$('cost-price').value=p.price;loadRecipe(p.name);updateCostResults();});
  ['cost-price','delivery-fee'].forEach(id=>$(id).addEventListener('input',updateCostResults));
  function renderIngredients(){
    $('ingredients-list').innerHTML=ingredients.map((x,i)=>`<div class="ingredient-row"><input aria-label="Concepto de insumo" data-ing-name="${i}" value="${esc(x.name)}" placeholder="Ej. Leche"><input aria-label="Costo por porción" data-ing-cost="${i}" type="number" min="0" step=".01" value="${Number(x.cost)||0}"><button class="remove-ingredient" data-remove="${i}" aria-label="Eliminar insumo">×</button></div>`).join('');
    $('ingredients-list').querySelectorAll('[data-ing-name]').forEach(el=>el.addEventListener('input',()=>{ingredients[Number(el.dataset.ingName)].name=el.value;updateCostResults();}));
    $('ingredients-list').querySelectorAll('[data-ing-cost]').forEach(el=>el.addEventListener('input',()=>{ingredients[Number(el.dataset.ingCost)].cost=Math.max(0,Number(el.value)||0);updateCostResults();}));
    $('ingredients-list').querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>{ingredients.splice(Number(el.dataset.remove),1);renderIngredients();updateCostResults();}));
    updateCostResults();
  }
  $('add-ingredient').addEventListener('click',()=>{ingredients.push({name:'Nuevo insumo',cost:0});renderIngredients();});
  function updateCostResults(){
    const total=ingredients.reduce((s,i)=>s+Math.max(0,Number(i.cost)||0),0),price=Math.max(0,Number($('cost-price').value)||0),fee=Math.min(100,Math.max(0,Number($('delivery-fee').value)||0)),commission=price*fee/100,profit=price-total-commission;
    $('ingredient-total').textContent=money(total);$('result-price').textContent=money(price);$('result-cost').textContent=money(total);$('result-fee').textContent=money(commission);$('delivery-profit').textContent=money(profit);$('delivery-profit').style.color=profit<0?'#f1a3a3':'#fffaf0';$('result-margin').textContent=(price?((profit/price)*100):0).toFixed(1)+'%';
    const unitPrice=Math.max(0,Number($('package-price').value)||0),unitCount=Math.max(0,Number($('package-units').value)||0);$('unit-cost').textContent=money(unitCount?unitPrice/unitCount:0);
  }
  ['package-price','package-units'].forEach(id=>$(id).addEventListener('input',updateCostResults));
  $('apply-unit-cost').addEventListener('click',()=>{ingredients.push({name:$('unit-name').value.trim()||'Insumo',cost:(Number($('package-units').value)>0?Math.max(0,Number($('package-price').value)||0)/Number($('package-units').value):0)});renderIngredients();toast('Costo unitario agregado a la receta.');});
  $('save-recipe').addEventListener('click',()=>{
    const recipes=JSON.parse(localStorage.getItem(keys.recipes)||'{}'),name=window.CAVA_MENU[Number($('cost-product').value)].name;
    recipes[name]={price:Number($('cost-price').value)||0,fee:Number($('delivery-fee').value)||0,ingredients:ingredients.map(i=>({...i}))};localStorage.setItem(keys.recipes,JSON.stringify(recipes));toast('Ficha guardada en este navegador.');
  });
  $('reset-recipe').addEventListener('click',()=>loadRecipe(window.CAVA_MENU[Number($('cost-product').value)].name));
  function loadRecipe(name){
    let recipes={};try{recipes=JSON.parse(localStorage.getItem(keys.recipes)||'{}')}catch{}
    const recipe=recipes[name];ingredients=recipe?recipe.ingredients.map(i=>({...i})):[{name:'Leche',cost:0},{name:'Café',cost:0},{name:'Vaso térmico',cost:0}];
    if(recipe){$('cost-price').value=recipe.price;$('delivery-fee').value=recipe.fee;}else{$('cost-price').value=window.CAVA_MENU.find(p=>p.name===name)?.price||0;$('delivery-fee').value=30;}
    renderIngredients();
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2600);}
})();
