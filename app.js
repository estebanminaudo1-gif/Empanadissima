/**
 * ==========================================================================
 * LÓGICA DE NEGOCIO Y CONTROLADOR DE INTERFAZ - EMPANADISSIMA
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Iconos Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Configuración Inicial de Precios
    // Nota: Modificar estos valores para futuros cambios de precio
    const PRECIOS = {
        pizza: 18500,
        empanada_unidad: 2500,
        empanada_docena: 28000,
        promo1: 42000, // 3 muzzas + 1 docena empanadas
        promo2: 30000, // 1 napolitana + 1 muzza
    };

    // Estado de la Aplicación (Carrito del Cliente)
    const state = {
        currentStep: 1,
        deliveryType: 'domicilio', // 'domicilio' o 'local'
        clientName: '',
        clientPhone: '',
        clientAddress: '',
        
        // Cantidades de productos
        pizzas: {
            muzza: 0,
            napolitana: 0,
            'napo-especial': 0,
            fugazzeta: 0
        },
        empanadas: {
            carne: 0,
            'carne-cuchillo': 0,
            pollo: 0,
            'jamon-queso': 0,
            verdura: 0
        },
        promos: {
            promo1: 0,
            promo2: 0
        },
        // Sabores seleccionados para la Promo 1 (12 empanadas por cada unidad de Promo 1)
        promo1Flavors: {
            carne: 0,
            'carne-cuchillo': 0,
            pollo: 0,
            'jamon-queso': 0,
            verdura: 0
        },
        
        beverages: {
            'coca-original': 0,
            'coca-zero': 0,
            sprite: 0
        },
        beverageUnitPrice: 2000, // Editable por el usuario
        
        paymentMethod: 'efectivo', // 'efectivo', 'transferencia', 'debito', 'credito'
        total: 0
    };

    // Base de datos de administradores (Datos reales reemplazables aquí)
    const ADMIN_USERS = [
        { username: 'administrador', password: 'admin123', name: 'Administrador' },
        { username: 'esteban', password: 'admin123', name: 'Esteban' }
    ];

    let currentAdmin = null; // Guardará el administrador logueado

    /* ==========================================================================
       CONTROL DEL ASISTENTE (WIZARD)
       ========================================================================== */
    const steps = document.querySelectorAll('.wizard-step');
    const stepNodes = document.querySelectorAll('.step-node');
    const progressFill = document.getElementById('progress-fill');

    // Cambiar de paso
    window.goToStep = function(stepNum) {
        if (stepNum < 1 || stepNum > 4) return;
        
        // Si va hacia adelante, validar campos del paso actual
        if (stepNum > state.currentStep) {
            if (!validateStep(state.currentStep)) {
                showToast('Por favor, completa los campos requeridos marcados con *', 'error');
                return;
            }
        }

        // Actualizar estado del paso
        state.currentStep = stepNum;

        // Mostrar paso activo
        steps.forEach(step => step.classList.remove('active'));
        document.getElementById(`wizard-step-${stepNum}`).classList.add('active');

        // Actualizar Stepper Nodes
        stepNodes.forEach(node => {
            const nodeStep = parseInt(node.getAttribute('data-step'));
            node.classList.remove('active', 'completed');
            
            if (nodeStep === stepNum) {
                node.classList.add('active');
            } else if (nodeStep < stepNum) {
                node.classList.add('completed');
            }
        });

        // Actualizar Línea de Progreso
        const progressPercentage = ((stepNum - 1) / 3) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        // Si es el paso 4 (Confirmación), rellenar el resumen
        if (stepNum === 4) {
            fillOrderSummary();
        }

        // Scroll suave al inicio del asistente
        document.getElementById('wizard-section').scrollIntoView({ behavior: 'smooth' });
    };

    // Botones de Navegación del Wizard
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStep = parseInt(btn.getAttribute('data-next'));
            goToStep(nextStep);
        });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            const prevStep = parseInt(btn.getAttribute('data-prev'));
            goToStep(prevStep);
        });
    });

    // Cambiar de paso haciendo clic en los círculos superiores (solo si ya se validó)
    stepNodes.forEach(node => {
        node.addEventListener('click', () => {
            const targetStep = parseInt(node.getAttribute('data-step'));
            // Solo permitir navegar si es hacia atrás o si los pasos intermedios son válidos
            if (targetStep < state.currentStep) {
                goToStep(targetStep);
            } else if (targetStep > state.currentStep) {
                // Validar paso a paso
                let canNavigate = true;
                for (let s = state.currentStep; s < targetStep; s++) {
                    if (!validateStep(s)) {
                        canNavigate = false;
                        break;
                    }
                }
                if (canNavigate) {
                    goToStep(targetStep);
                } else {
                    showToast('Completa los campos obligatorios antes de avanzar.', 'error');
                }
            }
        });
    });

    /* ==========================================================================
       VALIDACIONES POR PASO
       ========================================================================== */
    function validateStep(stepNum) {
        let isValid = true;

        if (stepNum === 1) {
            // Validar Paso 1: Datos cliente
            const nameInput = document.getElementById('client_name');
            const phoneInput = document.getElementById('client_phone');
            const addressInput = document.getElementById('client_address');

            state.clientName = nameInput.value.trim();
            state.clientPhone = phoneInput.value.trim();
            state.clientAddress = addressInput.value.trim();

            // Validar Nombre
            if (!state.clientName) {
                document.getElementById('name-error').parentElement.classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('name-error').parentElement.classList.remove('has-error');
            }

            // Validar Teléfono
            if (!state.clientPhone) {
                document.getElementById('phone-error').parentElement.classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('phone-error').parentElement.classList.remove('has-error');
            }

            // Validar Dirección (Solo si es Envío a Domicilio)
            if (state.deliveryType === 'domicilio') {
                if (!state.clientAddress) {
                    document.getElementById('address-error').parentElement.classList.add('has-error');
                    isValid = false;
                } else {
                    document.getElementById('address-error').parentElement.classList.remove('has-error');
                }
            } else {
                document.getElementById('address-error').parentElement.classList.remove('has-error');
            }
        }

        if (stepNum === 2) {
            // Validar Paso 2: Debe haber elegido al menos un producto
            const totalItems = getCartTotalItems();
            if (totalItems === 0) {
                showToast('Debes agregar al menos un producto a tu pedido.', 'error');
                isValid = false;
            }

            // Validar sabores de la Promo 1 si está seleccionada
            if (state.promos.promo1 > 0) {
                const totalPromo1Flavors = getPromo1SelectedFlavorsCount();
                const expectedFlavors = state.promos.promo1 * 12;
                if (totalPromo1Flavors !== expectedFlavors) {
                    document.getElementById('promo1-flavor-error').style.display = 'block';
                    document.getElementById('promo1-flavors-section').scrollIntoView({ behavior: 'smooth' });
                    isValid = false;
                } else {
                    document.getElementById('promo1-flavor-error').style.display = 'none';
                }
            }
        }

        return isValid;
    }

    // Calcular el total de artículos en el carrito
    function getCartTotalItems() {
        let pizzaCount = Object.values(state.pizzas).reduce((a, b) => a + b, 0);
        let empanadaCount = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        let promoCount = Object.values(state.promos).reduce((a, b) => a + b, 0);
        return pizzaCount + empanadaCount + promoCount;
    }

    // Calcular sabores seleccionados en la Promo 1
    function getPromo1SelectedFlavorsCount() {
        return Object.values(state.promo1Flavors).reduce((a, b) => a + b, 0);
    }

    /* ==========================================================================
       GESTIÓN DEL TIPO DE ENTREGA
       ========================================================================== */
    const deliveryRadioButtons = document.querySelectorAll('input[name="delivery_type"]');
    const addressGroup = document.getElementById('address-group');
    const localInfoBox = document.getElementById('local-info-box');

    deliveryRadioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Desmarcar todos los contenedores visuales
            document.querySelectorAll('.delivery-card-option').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Marcar el seleccionado
            e.target.closest('.delivery-card-option').classList.add('selected');
            
            state.deliveryType = e.target.value;

            // Mostrar/Ocultar campos según el tipo
            if (state.deliveryType === 'domicilio') {
                addressGroup.style.display = 'block';
                localInfoBox.style.display = 'none';
            } else {
                addressGroup.style.display = 'none';
                localInfoBox.style.display = 'flex';
                // Limpiar error de dirección si existía
                addressGroup.classList.remove('has-error');
            }
            
            updateCartCalculations();
        });
    });

    /* ==========================================================================
       AJUSTES DE CANTIDADES EN EL CARRITO
       ========================================================================== */
    
    // Pizzas
    window.adjustPizzaQty = function(pizzaType, amount) {
        const currentQty = state.pizzas[pizzaType];
        const newQty = Math.max(0, currentQty + amount);
        
        state.pizzas[pizzaType] = newQty;
        document.getElementById(`qty-pizza-${pizzaType}`).textContent = newQty;
        document.querySelector(`input[name="pizza_${pizzaType.replace('-', '_')}"]`).value = newQty;
        
        updateCartCalculations();
    };

    // Empanadas
    window.adjustEmpanadaQty = function(flavor, amount) {
        const currentQty = state.empanadas[flavor];
        const newQty = Math.max(0, currentQty + amount);
        
        state.empanadas[flavor] = newQty;
        document.getElementById(`qty-empanada-${flavor}`).textContent = newQty;
        document.querySelector(`input[name="empanada_${flavor.replace('-', '_')}"]`).value = newQty;
        
        // Actualizar trackers de empanadas
        const totalEmpanadas = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        document.getElementById('empanadas-total-qty').textContent = totalEmpanadas;
        
        // Calcular cuántas docenas y cuántas sueltas son visualmente
        const docenas = Math.floor(totalEmpanadas / 12);
        const sueltas = totalEmpanadas % 12;
        let trackerText = `${docenas}`;
        if (sueltas > 0) {
            trackerText += ` (+ ${sueltas} u.)`;
        }
        document.getElementById('empanadas-docenas-calc').textContent = trackerText;

        updateCartCalculations();
    };

    // Promociones
    window.adjustPromoQty = function(promoType, amount) {
        const currentQty = state.promos[promoType];
        const newQty = Math.max(0, currentQty + amount);
        
        state.promos[promoType] = newQty;
        document.getElementById(`qty-promo-${promoType}`).textContent = newQty;
        document.querySelector(`input[name="promo_${promoType}"]`).value = newQty;

        // Si es Promo 1, manejar la sección de selección de sabores
        if (promoType === 'promo1') {
            const promo1FlavorsSection = document.getElementById('promo1-flavors-section');
            if (newQty > 0) {
                promo1FlavorsSection.style.display = 'block';
                const targetQty = newQty * 12;
                document.getElementById('promo1-target-qty').textContent = targetQty;
                
                // Si cambiamos la cantidad, tal vez resetear o ajustar los sabores seleccionados
                adjustPromo1FlavorsToLimit(targetQty);
            } else {
                promo1FlavorsSection.style.display = 'none';
                // Resetear sabores de promo1
                resetPromo1Flavors();
            }
        }
        
        updateCartCalculations();
    };

    // Sabores de Promo 1
    window.adjustPromo1Flavor = function(flavor, amount) {
        const currentQty = state.promo1Flavors[flavor];
        const totalSelected = getPromo1SelectedFlavorsCount();
        const maxAllowed = state.promos.promo1 * 12;

        if (amount > 0 && totalSelected >= maxAllowed) {
            showToast(`Ya seleccionaste las ${maxAllowed} empanadas de tu Promo 1.`, 'info');
            return;
        }

        const newQty = Math.max(0, currentQty + amount);
        state.promo1Flavors[flavor] = newQty;
        document.getElementById(`qty-promo1-${flavor}`).textContent = newQty;
        
        const newTotalSelected = getPromo1SelectedFlavorsCount();
        document.getElementById('promo1-selected-qty').textContent = newTotalSelected;

        // Ocultar error si ya completó el cupo
        if (newTotalSelected === maxAllowed) {
            document.getElementById('promo1-flavor-error').style.display = 'none';
        }
    };

    function adjustPromo1FlavorsToLimit(targetLimit) {
        let currentTotal = getPromo1SelectedFlavorsCount();
        
        // Si el total actual supera el límite, resetear sabores para evitar inconsistencias
        if (currentTotal > targetLimit) {
            resetPromo1Flavors();
            document.getElementById('promo1-selected-qty').textContent = '0';
        } else {
            document.getElementById('promo1-selected-qty').textContent = currentTotal;
        }
    }

    function resetPromo1Flavors() {
        for (let flavor in state.promo1Flavors) {
            state.promo1Flavors[flavor] = 0;
            const element = document.getElementById(`qty-promo1-${flavor}`);
            if (element) element.textContent = '0';
        }
        document.getElementById('promo1-selected-qty').textContent = '0';
    }

    // Bebidas
    window.adjustBeverageQty = function(beverageType, amount) {
        const currentQty = state.beverages[beverageType];
        const newQty = Math.max(0, currentQty + amount);
        
        state.beverages[beverageType] = newQty;
        document.getElementById(`qty-bev-${beverageType}`).textContent = newQty;
        document.querySelector(`input[name="bev_${beverageType.replace('-', '_')}"]`).value = newQty;
        
        updateCartCalculations();
    };

    // Actualizar precio de bebidas de forma interactiva
    window.updateBeveragePrices = function(newPrice) {
        const price = Math.max(0, parseInt(newPrice) || 0);
        state.beverageUnitPrice = price;

        // Actualizar etiquetas visuales de precios de bebidas
        document.querySelectorAll('.beverage-price-display').forEach(display => {
            display.textContent = `$${price.toLocaleString('es-AR')} c/u`;
        });

        updateCartCalculations();
    };

    /* ==========================================================================
       CÁLCULO AUTOMÁTICO DE PRECIOS Y CARRITO
       ========================================================================== */
    function updateCartCalculations() {
        let total = 0;

        // 1. Calcular Pizzas
        const pizzaQty = Object.values(state.pizzas).reduce((a, b) => a + b, 0);
        const pizzasTotal = pizzaQty * PRECIOS.pizza;
        total += pizzasTotal;

        // 2. Calcular Empanadas con la fórmula optimizada
        const empanadaQty = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        const docenas = Math.floor(empanadaQty / 12);
        const unidadesSueltas = empanadaQty % 12;
        const empanadasTotal = (docenas * PRECIOS.empanada_docena) + (unidadesSueltas * PRECIOS.empanada_unidad);
        total += empanadasTotal;

        // 3. Calcular Promociones
        const promo1Total = state.promos.promo1 * PRECIOS.promo1;
        const promo2Total = state.promos.promo2 * PRECIOS.promo2;
        total += promo1Total + promo2Total;

        // 4. Calcular Bebidas
        const beverageQty = Object.values(state.beverages).reduce((a, b) => a + b, 0);
        const beveragesTotal = beverageQty * state.beverageUnitPrice;
        total += beveragesTotal;

        // Actualizar Estado
        state.total = total;

        // Renderizar vistas del Carrito
        renderSidebarSummary(docenas, unidadesSueltas);
    }

    // Renderizar la barra lateral (Mi Pedido) y el subtotal flotante
    function renderSidebarSummary(docenas, unidadesSueltas) {
        const sidebarList = document.getElementById('sidebar-items-list');
        const sidebarTotalPrice = document.getElementById('sidebar-total-price');
        
        sidebarList.innerHTML = '';
        let hasItems = false;

        // Renderizar Pizzas
        for (let type in state.pizzas) {
            const qty = state.pizzas[type];
            if (qty > 0) {
                hasItems = true;
                const pizzaName = {
                    muzza: 'Pizza Muzzarella',
                    napolitana: 'Pizza Napolitana',
                    'napo-especial': 'Pizza Napo Especial',
                    fugazzeta: 'Pizza Fugazzeta'
                }[type];

                sidebarList.appendChild(createSidebarItemRow(qty, pizzaName, null, qty * PRECIOS.pizza));
            }
        }

        // Renderizar Empanadas (Mostrar desglose inteligente)
        const empanadaQty = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        if (empanadaQty > 0) {
            hasItems = true;
            
            // Listar sabores elegidos
            const flavorDetails = [];
            for (let flavor in state.empanadas) {
                const qty = state.empanadas[flavor];
                if (qty > 0) {
                    const flavorName = {
                        carne: 'Carne',
                        'carne-cuchillo': 'Carne a Cuchillo',
                        pollo: 'Pollo',
                        'jamon-queso': 'J&Q',
                        verdura: 'Verdura'
                    }[flavor];
                    flavorDetails.push(`${qty} ${flavorName}`);
                }
            }

            const empanadasPrice = (docenas * PRECIOS.empanada_docena) + (unidadesSueltas * PRECIOS.empanada_unidad);
            let desc = flavorDetails.join(', ');
            
            // Añadir nota de docena si aplica
            if (docenas > 0) {
                desc += ` (${docenas} docena${docenas > 1 ? 's' : ''}`;
                if (unidadesSueltas > 0) {
                    desc += ` + ${unidadesSueltas} u.`;
                }
                desc += ` con descuento)`;
            }

            sidebarList.appendChild(createSidebarItemRow(empanadaQty, 'Empanadas Caseras', desc, empanadasPrice));
        }

        // Renderizar Promos
        if (state.promos.promo1 > 0) {
            hasItems = true;
            // Detalle de sabores elegidos en la promo 1
            const flavors = [];
            for (let f in state.promo1Flavors) {
                if (state.promo1Flavors[f] > 0) {
                    const name = { carne: 'Carne', 'carne-cuchillo': 'Cuchillo', pollo: 'Pollo', 'jamon-queso': 'J&Q', verdura: 'Verdura' }[f];
                    flavors.push(`${state.promo1Flavors[f]} ${name}`);
                }
            }
            const desc = flavors.length > 0 ? `Sabores: ${flavors.join(', ')}` : 'Pendiente elegir sabores';
            sidebarList.appendChild(createSidebarItemRow(state.promos.promo1, 'Promo 1: 3 Muzzas + 1 Doc. Empanadas', desc, state.promos.promo1 * PRECIOS.promo1));
        }

        if (state.promos.promo2 > 0) {
            hasItems = true;
            sidebarList.appendChild(createSidebarItemRow(state.promos.promo2, 'Promo 2: 1 Napo + 1 Muzza', '2 pizzas listas para comer', state.promos.promo2 * PRECIOS.promo2));
        }

        // Renderizar Bebidas
        for (let type in state.beverages) {
            const qty = state.beverages[type];
            if (qty > 0) {
                hasItems = true;
                const name = {
                    'coca-original': 'Coca-Cola Sabor Original',
                    'coca-zero': 'Coca-Cola Sin Azúcar',
                    sprite: 'Sprite Lima-Limón'
                }[type];

                sidebarList.appendChild(createSidebarItemRow(qty, name, null, qty * state.beverageUnitPrice));
            }
        }

        // Si el carrito está vacío, mostrar mensaje por defecto
        if (!hasItems) {
            sidebarList.innerHTML = '<p class="empty-sidebar-msg">Empieza a seleccionar empanadas, pizzas o promos de arriba.</p>';
        }

        // Actualizar totales visuales
        sidebarTotalPrice.textContent = `$${state.total.toLocaleString('es-AR')}`;
    }

    function createSidebarItemRow(qty, name, details, price) {
        const row = document.createElement('div');
        row.className = 'sidebar-item-row';
        
        row.innerHTML = `
            <div class="sidebar-item-info">
                <span class="sidebar-item-name"><span class="sidebar-item-qty">${qty}x</span> ${name}</span>
                ${details ? `<span class="sidebar-item-details">${details}</span>` : ''}
            </div>
            <span class="sidebar-item-price">$${price.toLocaleString('es-AR')}</span>
        `;
        return row;
    }

    /* ==========================================================================
       PASO 4: LLENAR EL RESUMEN DE CONFIRMACIÓN
       ========================================================================== */
    function fillOrderSummary() {
        // Datos Cliente
        document.getElementById('sum-client-name').textContent = state.clientName;
        document.getElementById('sum-client-phone').textContent = state.clientPhone;
        document.getElementById('sum-delivery-type').textContent = state.deliveryType === 'domicilio' ? 'Envío a Domicilio' : 'Retiro en Local';
        
        const sumAddressRow = document.getElementById('sum-address-row');
        if (state.deliveryType === 'domicilio') {
            sumAddressRow.style.display = 'block';
            document.getElementById('sum-client-address').textContent = state.clientAddress;
        } else {
            sumAddressRow.style.display = 'none';
        }

        // Detalle de Items
        const summaryItemsList = document.getElementById('summary-items-list');
        summaryItemsList.innerHTML = '';

        // Pizzas
        for (let type in state.pizzas) {
            const qty = state.pizzas[type];
            if (qty > 0) {
                const name = { muzza: 'Muzzarella', napolitana: 'Napolitana', 'napo-especial': 'Napolitana Especial', fugazzeta: 'Fugazzeta' }[type];
                summaryItemsList.appendChild(createSummaryRow(`${qty}x Pizza ${name}`, qty * PRECIOS.pizza));
            }
        }

        // Empanadas
        const empanadaQty = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        if (empanadaQty > 0) {
            const docenas = Math.floor(empanadaQty / 12);
            const sueltas = empanadaQty % 12;
            const price = (docenas * PRECIOS.empanada_docena) + (sueltas * PRECIOS.empanada_unidad);
            
            let label = `${empanadaQty}x Empanadas Caseras`;
            if (docenas > 0) {
                label += ` (${docenas} docena${docenas > 1 ? 's' : ''}`;
                if (sueltas > 0) label += ` + ${sueltas} u.`;
                label += ` con desc.)`;
            }

            summaryItemsList.appendChild(createSummaryRow(label, price));

            // Sabores elegidos
            const flavors = [];
            for (let f in state.empanadas) {
                if (state.empanadas[f] > 0) {
                    const fName = { carne: 'Carne', 'carne-cuchillo': 'Carne a Cuchillo', pollo: 'Pollo', 'jamon-queso': 'Jamón y Queso', verdura: 'Verdura' }[f];
                    flavors.push(`${state.empanadas[f]} ${fName}`);
                }
            }
            summaryItemsList.appendChild(createSummarySubRow(`Sabores: ${flavors.join(', ')}`));
        }

        // Promos
        if (state.promos.promo1 > 0) {
            summaryItemsList.appendChild(createSummaryRow(`${state.promos.promo1}x Promo 1 (3 Muzzas + 1 Doc. Empanadas)`, state.promos.promo1 * PRECIOS.promo1));
            
            // Sabores de la promo
            const flavors = [];
            for (let f in state.promo1Flavors) {
                if (state.promo1Flavors[f] > 0) {
                    const fName = { carne: 'Carne', 'carne-cuchillo': 'Carne a Cuchillo', pollo: 'Pollo', 'jamon-queso': 'Jamón y Queso', verdura: 'Verdura' }[f];
                    flavors.push(`${state.promo1Flavors[f]} ${fName}`);
                }
            }
            summaryItemsList.appendChild(createSummarySubRow(`Sabores Empanadas Promo: ${flavors.join(', ')}`));
        }

        if (state.promos.promo2 > 0) {
            summaryItemsList.appendChild(createSummaryRow(`${state.promos.promo2}x Promo 2 (1 Napolitana + 1 Muzzarella)`, state.promos.promo2 * PRECIOS.promo2));
        }

        // Bebidas
        for (let type in state.beverages) {
            const qty = state.beverages[type];
            if (qty > 0) {
                const name = { 'coca-original': 'Coca-Cola Original', 'coca-zero': 'Coca-Cola Zero', sprite: 'Sprite' }[type];
                summaryItemsList.appendChild(createSummaryRow(`${qty}x Bebida ${name}`, qty * state.beverageUnitPrice));
            }
        }

        // Total
        document.getElementById('summary-total-price').textContent = `$${state.total.toLocaleString('es-AR')}`;
    }

    function createSummaryRow(labelText, price) {
        const el = document.createElement('div');
        el.className = 'summary-item-row';
        el.innerHTML = `
            <span>${labelText}</span>
            <strong>$${price.toLocaleString('es-AR')}</strong>
        `;
        return el;
    }

    function createSummarySubRow(text) {
        const el = document.createElement('div');
        el.className = 'summary-item-row sub-row';
        el.innerHTML = `<span>${text}</span>`;
        return el;
    }

    /* ==========================================================================
       GESTIÓN DEL MEDIO DE PAGO
       ========================================================================== */
    const paymentRadioButtons = document.querySelectorAll('input[name="payment_method"]');
    
    paymentRadioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Desmarcar todos
            document.querySelectorAll('.payment-card-option').forEach(card => {
                card.classList.remove('selected');
            });
            // Marcar el activo
            e.target.closest('.payment-card-option').classList.add('selected');
            
            state.paymentMethod = e.target.value;

            // Mostrar la instrucción correspondiente
            document.getElementById('payment-desc-efectivo').style.display = 'none';
            document.getElementById('payment-desc-transferencia').style.display = 'none';
            document.getElementById('payment-desc-tarjeta').style.display = 'none';

            if (state.paymentMethod === 'efectivo') {
                document.getElementById('payment-desc-efectivo').style.display = 'flex';
            } else if (state.paymentMethod === 'transferencia') {
                document.getElementById('payment-desc-transferencia').style.display = 'flex';
            } else {
                document.getElementById('payment-desc-tarjeta').style.display = 'flex';
            }
        });
    });

    /* ==========================================================================
       COMPORTAMIENTO DE LAS PESTAÑAS DEL PASO 2 (PRODUCTOS)
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetContainerId = btn.getAttribute('data-tab');

            // Quitar clase active de todos los botones y contenidos
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Agregar clase active al seleccionado
            btn.classList.add('active');
            document.getElementById(targetContainerId).classList.add('active');
        });
    });

    /* ==========================================================================
       CONFIRMACIÓN FINAL DEL PEDIDO (CLIENTE)
       ========================================================================== */
    const btnConfirmOrder = document.getElementById('btn-confirm-order');

    btnConfirmOrder.addEventListener('click', () => {
        // Ejecutar validaciones una última vez
        if (!validateStep(1) || !validateStep(2)) return;

        // Construir detalle del pedido estructurado en texto para el Administrador
        const itemsList = [];
        
        // Pizzas
        for (let type in state.pizzas) {
            if (state.pizzas[type] > 0) {
                const name = { muzza: 'Muzza', napolitana: 'Napo', 'napo-especial': 'Napo Esp.', fugazzeta: 'Fugazzeta' }[type];
                itemsList.push(`${state.pizzas[type]}x Pizza ${name}`);
            }
        }
        
        // Empanadas
        const empanadaQty = Object.values(state.empanadas).reduce((a, b) => a + b, 0);
        if (empanadaQty > 0) {
            const flavors = [];
            for (let f in state.empanadas) {
                if (state.empanadas[f] > 0) {
                    const fName = { carne: 'Carne', 'carne-cuchillo': 'Cuchillo', pollo: 'Pollo', 'jamon-queso': 'J&Q', verdura: 'Verdura' }[f];
                    flavors.push(`${state.empanadas[f]} ${fName}`);
                }
            }
            itemsList.push(`${empanadaQty}x Empanadas (${flavors.join(', ')})`);
        }

        // Promos
        if (state.promos.promo1 > 0) {
            const flavors = [];
            for (let f in state.promo1Flavors) {
                if (state.promo1Flavors[f] > 0) {
                    const fName = { carne: 'Carne', 'carne-cuchillo': 'Cuchillo', pollo: 'Pollo', 'jamon-queso': 'J&Q', verdura: 'Verdura' }[f];
                    flavors.push(`${state.promo1Flavors[f]} ${fName}`);
                }
            }
            itemsList.push(`${state.promos.promo1}x Promo 1 (3 Muzzas + 1 Doc. Empanadas de [${flavors.join(', ')}])`);
        }

        if (state.promos.promo2 > 0) {
            itemsList.push(`${state.promos.promo2}x Promo 2 (1 Napo + 1 Muzza)`);
        }

        // Bebidas
        for (let type in state.beverages) {
            if (state.beverages[type] > 0) {
                const name = { 'coca-original': 'Coca Original', 'coca-zero': 'Coca Zero', sprite: 'Sprite' }[type];
                itemsList.push(`${state.beverages[type]}x Bebida ${name}`);
            }
        }

        // Obtener el número de orden autoincremental
        let lastOrderNum = parseInt(localStorage.getItem('empanadissima_last_order_num')) || 1000;
        const newOrderNum = lastOrderNum + 1;
        localStorage.setItem('empanadissima_last_order_num', newOrderNum);

        // Crear Objeto de Pedido
        const nuevoPedido = {
            id: newOrderNum,
            fecha: new Date().toISOString(),
            nombre: state.clientName,
            telefono: state.clientPhone,
            tipoEntrega: state.deliveryType,
            direccion: state.deliveryType === 'domicilio' ? state.clientAddress : '',
            detalle: itemsList.join(' | '),
            total: state.total,
            medioPago: {
                efectivo: 'Efectivo',
                transferencia: 'Transferencia',
                debito: 'Tarjeta de Débito',
                credito: 'Tarjeta de Crédito'
            }[state.paymentMethod],
            estado: 'Nuevo', // 'Nuevo', 'Tomado', 'Entregado'
            adminTomo: '',
            adminEntrego: ''
        };

        // Guardar Pedido en localStorage
        let pedidos = JSON.parse(localStorage.getItem('empanadissima_pedidos')) || [];
        pedidos.push(nuevoPedido);
        localStorage.setItem('empanadissima_pedidos', JSON.stringify(pedidos));

        // Mostrar Feedback Exitoso
        showSuccessModal(newOrderNum);

        // Resetear Carrito y Formulario
        resetCartAndWizard();
    });

    // Resetear formulario y volver al Paso 1
    function resetCartAndWizard() {
        // Limpiar inputs texto
        document.getElementById('order-form').reset();
        
        // Resetear Cantidades en el estado
        for (let type in state.pizzas) state.pizzas[type] = 0;
        for (let type in state.empanadas) state.empanadas[type] = 0;
        for (let type in state.promos) state.promos[type] = 0;
        for (let type in state.beverages) state.beverages[type] = 0;
        resetPromo1Flavors();

        // Resetear visuales de los controladores de cantidad
        document.querySelectorAll('.qty-val').forEach(el => {
            el.textContent = '0';
        });

        // Resetear visuales especiales
        document.getElementById('empanadas-total-qty').textContent = '0';
        document.getElementById('empanadas-docenas-calc').textContent = '0';
        document.getElementById('promo1-flavors-section').style.display = 'none';

        // Resetear tipos de entrega a Domicilio
        state.deliveryType = 'domicilio';
        document.querySelectorAll('.delivery-card-option').forEach(card => card.classList.remove('selected'));
        document.querySelector('.delivery-card-option[value="domicilio"]').closest('.delivery-card-option').classList.add('selected');
        addressGroup.style.display = 'block';
        localInfoBox.style.display = 'none';

        // Volver a calcular totales
        updateCartCalculations();

        // Volver al Paso 1 visualmente
        goToStep(1);
    }

    // Modal de Éxito al Confirmar
    function showSuccessModal(orderNumber) {
        let msg = `¡Pedido <strong>#${orderNumber}</strong> Recibido!<br><br>`;
        if (state.deliveryType === 'domicilio') {
            msg += `Estaremos preparando tu pedido y lo enviaremos a tu domicilio en breve.`;
        } else {
            msg += `Puedes pasar a retirarlo por nuestro local en <strong>Edison 1587</strong> en 25-30 minutos.`;
        }

        if (state.paymentMethod === 'transferencia') {
            msg += `<br><br><span class="alias-tag">Recuerda hacer la transferencia al alias: alias.empanadissima</span>`;
        }

        // Crear una ventana emergente premium
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '3500';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 450px; text-align: center;">
                <div class="modal-header" style="justify-content: center; background-color: var(--color-success-light);">
                    <h3 style="color: var(--color-success);"><i data-lucide="check-circle"></i> ¡Pedido Confirmado!</h3>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <p style="font-size: 1.05rem; margin-bottom: 24px;">${msg}</p>
                    <button class="btn btn-success btn-block" id="btn-success-close">Excelente, ¡muchas gracias!</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        document.getElementById('btn-success-close').addEventListener('click', () => {
            modal.remove();
        });
    }

    /* ==========================================================================
       ACCESO AL PANEL DE ADMINISTRADOR
       ========================================================================== */
    const adminModal = document.getElementById('admin-modal');
    const adminLoginView = document.getElementById('admin-login-view');
    const adminDashboardView = document.getElementById('admin-dashboard-view');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const adminLoginLink = document.getElementById('admin-login-link');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error');

    // Abrir Modal
    adminLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        adminModal.classList.add('active');

        // Chequear si ya había un administrador logueado en la sesión
        const sessionAdmin = sessionStorage.getItem('empanadissima_active_admin');
        if (sessionAdmin) {
            const admin = JSON.parse(sessionAdmin);
            loginAdminUser(admin);
        } else {
            showLoginView();
        }
    });

    // Cerrar Modal
    btnCloseModal.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });

    // Cerrar haciendo clic fuera
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.classList.remove('active');
        }
    });

    function showLoginView() {
        adminLoginView.classList.add('active');
        adminDashboardView.classList.remove('active');
        document.getElementById('modal-title').innerHTML = '<i data-lucide="lock"></i> Autenticación de Administrador';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Ejecutar Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = (document.getElementById('admin_user').value || '').trim();
        const passVal = (document.getElementById('admin_password').value || '').trim(); // Recorta espacios en contraseña también

        const foundAdmin = ADMIN_USERS.find(u => 
            u && u.username && u.username.toLowerCase() === userVal.toLowerCase() && 
            u.password && u.password.trim() === passVal
        );

        if (foundAdmin) {
            loginError.style.display = 'none';
            loginForm.reset();
            
            // Guardar sesión
            sessionStorage.setItem('empanadissima_active_admin', JSON.stringify(foundAdmin));
            loginAdminUser(foundAdmin);
            
            showToast(`¡Sesión iniciada como ${foundAdmin.name}!`, 'success');
        } else {
            loginError.style.display = 'block';
        }
    });

    function loginAdminUser(admin) {
        currentAdmin = admin;
        
        adminLoginView.classList.remove('active');
        adminDashboardView.classList.add('active');
        document.getElementById('modal-title').innerHTML = '<i data-lucide="shield"></i> Panel de Administración';
        document.getElementById('logged-admin-name').textContent = admin.name;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Cargar Pedidos en el Dashboard
        renderAdminDashboard();
    }

    // Logout Administrador
    document.getElementById('btn-admin-logout').addEventListener('click', () => {
        sessionStorage.removeItem('empanadissima_active_admin');
        currentAdmin = null;
        showLoginView();
        showToast('Sesión de administrador cerrada.', 'info');
    });

    /* ==========================================================================
       GESTIÓN DEL PANEL DE ADMINISTRACIÓN (DASHBOARD)
       ========================================================================== */
    
    // Control de Pestañas del Dashboard
    const adminTabButtons = document.querySelectorAll('.admin-tab-btn');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');

    adminTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-admin-tab');

            adminTabButtons.forEach(b => b.classList.remove('active'));
            adminTabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTabId).classList.add('active');
        });
    });

    // Cargar y renderizar los pedidos en las tres pestañas
    function renderAdminDashboard() {
        let pedidos = [];
        try {
            pedidos = JSON.parse(localStorage.getItem('empanadissima_pedidos')) || [];
        } catch (e) {
            console.error("Error al leer pedidos de localStorage:", e);
            pedidos = [];
        }

        if (!Array.isArray(pedidos)) {
            pedidos = [];
        }

        // Contenedores de grillas
        const gridNuevos = document.getElementById('grid-nuevos');
        const gridTomados = document.getElementById('grid-tomados');
        const gridEntregados = document.getElementById('grid-entregados');

        if (!gridNuevos || !gridTomados || !gridEntregados) return;

        // Limpiar
        gridNuevos.innerHTML = '';
        gridTomados.innerHTML = '';
        gridEntregados.innerHTML = '';

        // Contadores
        let countNuevos = 0;
        let countTomados = 0;
        let countEntregados = 0;

        // Ordenar pedidos de más reciente a más antiguo de forma segura
        pedidos.sort((a, b) => {
            const dateA = a && a.fecha ? new Date(a.fecha) : new Date(0);
            const dateB = b && b.fecha ? new Date(b.fecha) : new Date(0);
            return dateB - dateA;
        });

        pedidos.forEach(order => {
            if (!order) return;
            try {
                const card = createAdminOrderCard(order);
                const estado = (order.estado || 'Nuevo').toString().toLowerCase();

                if (estado === 'nuevo') {
                    gridNuevos.appendChild(card);
                    countNuevos++;
                } else if (estado === 'tomado') {
                    gridTomados.appendChild(card);
                    countTomados++;
                } else if (estado === 'entregado') {
                    gridEntregados.appendChild(card);
                    countEntregados++;
                }
            } catch (e) {
                console.error("Error al renderizar tarjeta de pedido:", e, order);
            }
        });

        // Actualizar contadores en pestañas
        const cNuevos = document.getElementById('count-nuevos');
        const cTomados = document.getElementById('count-tomados');
        const cEntregados = document.getElementById('count-entregados');

        if (cNuevos) cNuevos.textContent = countNuevos;
        if (cTomados) cTomados.textContent = countTomados;
        if (cEntregados) cEntregados.textContent = countEntregados;

        // Mensajes por defecto de lista vacía
        if (countNuevos === 0) {
            gridNuevos.innerHTML = '<div class="no-orders-msg"><i data-lucide="check"></i> ¡No hay pedidos nuevos pendientes!</div>';
        }
        if (countTomados === 0) {
            gridTomados.innerHTML = '<div class="no-orders-msg"><i data-lucide="clock"></i> No hay ningún pedido en proceso en este momento.</div>';
        }
        if (countEntregados === 0) {
            gridEntregados.innerHTML = '<div class="no-orders-msg"><i data-lucide="archive"></i> Aún no se han completado entregas.</div>';
        }

        // Crear iconos de Lucide dinámicos
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function createAdminOrderCard(order) {
        const card = document.createElement('div');
        const estado = (order.estado || 'Nuevo').toString();
        card.className = `admin-order-card status-${estado.toLowerCase()}`;
        
        // Formatear Fecha
        let timeStr = '00:00';
        let dateStr = '00/00';
        try {
            const dateObj = new Date(order.fecha || Date.now());
            timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        } catch(e) {}

        const nombre = order.nombre || 'Cliente';
        const telefono = order.telefono || '-';
        const tipoEntrega = order.tipoEntrega || 'local';
        const direccion = order.direccion || '';

        // Detalles del cliente
        let clientDetails = `
            <strong>Nombre:</strong> ${nombre}<br>
            <strong>Teléfono:</strong> <a href="tel:${telefono}" style="color: var(--color-primary); font-weight: 700;">${telefono}</a><br>
            <strong>Entrega:</strong> ${tipoEntrega === 'domicilio' ? 'Envío a Domicilio' : 'Retira en Local'}
        `;

        if (tipoEntrega === 'domicilio' && direccion) {
            clientDetails += `<br><strong>Dirección:</strong> ${direccion}`;
        }

        // Acciones del pie según estado
        let footerActionBtn = '';
        if (estado === 'Nuevo') {
            footerActionBtn = `
                <button type="button" class="btn btn-primary btn-sm" onclick="takeOrder(${order.id})">
                    <i data-lucide="play"></i> Tomar Pedido
                </button>
            `;
        } else if (estado === 'Tomado') {
            footerActionBtn = `
                <button type="button" class="btn btn-success btn-sm" onclick="deliverOrder(${order.id})">
                    <i data-lucide="check"></i> Entregar Pedido
                </button>
            `;
        }

        // Historial de Logs de Auditoría
        let logsBox = '';
        if (estado === 'Tomado' && order.adminTomo) {
            logsBox = `<div class="order-logs-box"><i data-lucide="user-check"></i> Tomado por: <strong>${order.adminTomo}</strong></div>`;
        } else if (estado === 'Entregado') {
            logsBox = `
                <div class="order-logs-box" style="background-color: var(--color-success-light); border-left-color: var(--color-success); color: var(--color-success);">
                    <i data-lucide="user-check"></i> Entregado por: <strong>${order.adminEntrego}</strong>
                    ${order.adminTomo ? `<br><small>Tomado por: ${order.adminTomo}</small>` : ''}
                </div>
            `;
        }

        const detalleStr = typeof order.detalle === 'string' ? order.detalle : '';
        const items = detalleStr ? detalleStr.split(' | ') : ['Sin detalle de productos'];
        const total = typeof order.total === 'number' ? order.total : 0;
        const medioPago = order.medioPago || 'Efectivo';

        card.innerHTML = `
            <div class="order-card-header">
                <div>
                    <h5>Pedido #${order.id || 0}</h5>
                    <span class="order-card-date">${dateStr} - ${timeStr} hs</span>
                </div>
                <span class="order-card-badge badge-${estado.toLowerCase()}">${estado}</span>
            </div>
            
            <div class="order-card-body">
                <div class="client-info-row">
                    ${clientDetails}
                </div>
                
                <div class="items-detail-box">
                    <strong>Productos:</strong>
                    <ul>
                        ${items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>

                <div>
                    <strong>Medio de Pago:</strong> ${medioPago}
                </div>

                ${logsBox}
            </div>
            
            <div class="order-card-footer">
                <div class="order-card-total">
                    <span>Total</span>
                    <strong>$${total.toLocaleString('es-AR')}</strong>
                </div>
                ${footerActionBtn}
            </div>
        `;
        
        return card;
    }

    // ACCIONES ADMINISTRADORAS DISPONIBLES EN WINDOWS GLOBALS
    
    // Tomar pedido
    window.takeOrder = function(orderId) {
        if (!currentAdmin) {
            showToast('Debes iniciar sesión para realizar esta acción.', 'error');
            return;
        }

        let pedidos = JSON.parse(localStorage.getItem('empanadissima_pedidos')) || [];
        const index = pedidos.findIndex(o => o.id === orderId);

        if (index !== -1) {
            pedidos[index].estado = 'Tomado';
            pedidos[index].adminTomo = currentAdmin.name;

            localStorage.setItem('empanadissima_pedidos', JSON.stringify(pedidos));
            renderAdminDashboard();
            showToast(`¡Pedido #${orderId} tomado con éxito!`, 'success');
        }
    };

    // Entregar pedido
    window.deliverOrder = function(orderId) {
        if (!currentAdmin) {
            showToast('Debes iniciar sesión para realizar esta acción.', 'error');
            return;
        }

        let pedidos = JSON.parse(localStorage.getItem('empanadissima_pedidos')) || [];
        const index = pedidos.findIndex(o => o.id === orderId);

        if (index !== -1) {
            pedidos[index].estado = 'Entregado';
            pedidos[index].adminEntrego = currentAdmin.name;

            localStorage.setItem('empanadissima_pedidos', JSON.stringify(pedidos));
            renderAdminDashboard();
            showToast(`¡Pedido #${orderId} marcado como entregado!`, 'success');
        }
    };

    /* ==========================================================================
       SISTEMA DE NOTIFICACIONES TOAST
       ========================================================================== */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Definir icono
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
            <div class="toast-content">${message}</div>
        `;

        container.appendChild(toast);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Mostrar animación de deslizamiento
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Eliminar después de 3.5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    }
});
