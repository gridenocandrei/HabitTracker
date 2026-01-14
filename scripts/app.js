'use strict';

let habbits = [];
const HABBIT_KEY = 'HABBIT_KEY';
let globalActiveHabbitId;

/* page elements */
const page = {
    menu: document.querySelector('.menu__list'),
    header: {
        h1: document.querySelector('.h1'),
        progressPercent: document.querySelector('.progress__percent'),
        progressCoverBar: document.querySelector('.progress__cover-bar'),
    },
    content: {
        daysContainer: document.getElementById('days'),
        nextDay: document.querySelector('.habbit__day')
    },
    popup: {
        index: document.getElementById('add-habbit-popup'),
        iconField: document.querySelector('.popup__form input[name="icon"]')
    }
}

/* utils */

async function loadData() {
    const habbitString = localStorage.getItem(HABBIT_KEY);
    if (habbitString && JSON.parse(habbitString).length > 0) {
        habbits = JSON.parse(habbitString);
        console.log('Данные загружены из LocalStorage');
    } else {
        console.log('LocalStorage пуст, пытаемся загрузить habbits.json...');
        try {
            const response = await fetch('./habbits.json');
            
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }

            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                habbits = data;
                saveData();
                console.log('Данные успешно импортированы из JSON файла');
            }
        } catch (e) {
            console.error('Не удалось загрузить JSON. Проверьте путь к файлу или запустите через Live Server.', e);
            habbits = []; 
        }
    }
}

function saveData() {
    localStorage.setItem(HABBIT_KEY, JSON.stringify(habbits));
}

function togglePopup() {
    page.popup.index.classList.toggle('cover_hidden');
}

function resetForm(form, fields) {
    for (const field of fields) {
        form[field].value = '';
    }
}

function validateAndGetFormData(form, fields) {
    const formData = new FormData(form);
    const res = {};
    let isValid = true;
    
    for (const field of fields) {
        const fieldElement = formData.get(field);
        form[field].classList.remove('error');
        if (!fieldElement) {
            form[field].classList.add('error');
            isValid = false;
        }
        res[field] = fieldElement;
    }
    
    return isValid ? res : false;
}

/* render */
function rerenderMenu(activeHabbit) {
    if (!activeHabbit) return;

    for (const habbit of habbits) {
        const existed = document.querySelector(`[menu-habbit-id="${habbit.id}"]`);
        if (!existed) {
            const element = document.createElement('button');
            element.setAttribute('menu-habbit-id', habbit.id);
            element.classList.add('menu__item');
            element.addEventListener('click', () => rerender(habbit.id));
            
            const iconName = habbit.icon.toLowerCase();
            element.innerHTML = `<img src="./images/${iconName}.svg" alt="${habbit.name}" />`;
            
            if (activeHabbit.id == habbit.id) {
                element.classList.add('menu__item_active');
            }
            page.menu.appendChild(element);
            continue;
        }
        
        if (activeHabbit.id == habbit.id) {
            existed.classList.add('menu__item_active');
        } else {
            existed.classList.remove('menu__item_active');
        }
    }
}

function rerenderHead(activeHabbit) {
    page.header.h1.innerText = activeHabbit.name;
}

function rerenderContent(activeHabbit) {
    page.content.daysContainer.innerHTML = '';
    activeHabbit.days.forEach((day, index) => {
        const element = document.createElement('div');
        element.classList.add('habbit');
        element.innerHTML = `
            <div class="habbit__day">Day ${index + 1}</div>
            <div class="habbit__comment">${day.comment}</div>
            <button class="habbit__delete" onclick="deleteDay(${index})">
                <img src="./images/delete.svg" alt="Remove day ${index + 1}">
            </button>`;
        page.content.daysContainer.appendChild(element);
    });
    page.content.nextDay.innerText = `Day ${activeHabbit.days.length + 1}`;
}

function rerender(activeHabbitId) {
    globalActiveHabbitId = activeHabbitId;
    const activeHabbit = habbits.find(habbit => habbit.id == activeHabbitId);
    
    if (!activeHabbit) return;

    document.location.replace(document.location.pathname + '#' + activeHabbitId);
    rerenderMenu(activeHabbit);
    rerenderHead(activeHabbit);
    rerenderContent(activeHabbit);
    
    const progress = activeHabbit.target <= 0 ? 0 : 
        (activeHabbit.days.length / activeHabbit.target) * 100;
        
    const finalProgress = progress > 100 ? 100 : progress;
        
    page.header.progressPercent.innerText = finalProgress.toFixed(0) + ' %';
    page.header.progressCoverBar.setAttribute('style', `width: ${finalProgress}%`);
}

/* work with days */
function addDays(event) {
    event.preventDefault();
    const data = validateAndGetFormData(event.target, ['comment']);
    if (!data) return;

    habbits = habbits.map(habbit => {
        if (habbit.id == globalActiveHabbitId) {
            return {
                ...habbit,
                days: habbit.days.concat([{ comment: data['comment'] }])
            }
        }
        return habbit;
    });
    resetForm(event.target, ['comment']);
    saveData();
    rerender(globalActiveHabbitId);
}

function deleteDay(index) {
    const currentHabbit = habbits.find(h => h.id == globalActiveHabbitId);
    if (!currentHabbit) return;

    currentHabbit.days.splice(index, 1);
    saveData();
    rerender(globalActiveHabbitId);
}

/* work with habbits */
function setIcon(context, icon) {
    page.popup.iconField.value = icon;
    const activeIcon = document.querySelector('.icon.icon_active');
    if (activeIcon) activeIcon.classList.remove('icon_active');
    context.classList.add('icon_active');
}

function addHabbit(event) {
    event.preventDefault();
    const data = validateAndGetFormData(event.target, ['name', 'icon', 'target']);
    if (!data) return;

    const maxId = habbits.reduce((acc, habbit) => acc > Number(habbit.id) ? acc : Number(habbit.id), 0);
    const newId = maxId + 1;
    
    habbits.push({
        id: newId,
        name: data.name,
        target: Number(data.target),
        icon: data.icon,
        days: []
    });
    
    resetForm(event.target, ['name', 'target']);
    togglePopup();
    saveData();
    rerender(newId);
}

/* init1 */
(async () => {
    await loadData();
    
    if (habbits.length === 0) {
        console.warn('Список привычек пуст. Добавьте первую привычку через UI.');
        return;
    }

    const hashId = Number(document.location.hash.replace('#', ''));
    const urlHabbit = habbits.find(habbit => Number(habbit.id) === hashId);

    if (urlHabbit) {
        rerender(urlHabbit.id);
    } else {
        rerender(habbits[0].id);
    }
})();