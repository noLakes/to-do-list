import db from './data';
import { elements, render,} from './dom';
import { format } from 'date-fns'

// a logic controller for the different ways you might want to render/show the content
// contains event listeners for interacting with DOM elements
const controller = (function() {

  const clearActive = () => {
    document.querySelectorAll('.nav-container a').forEach(link => {
      link.classList.remove('active');
    })
  }

  const clearContent = () => {
    elements.content.innerHTML = '';
  }

  const endOfDay = () => {
    const now = new Date();
    return new Date(now.getFullYear()
              ,now.getMonth()
              ,now.getDate()
              ,23,59,59);
  }

  const startOfDay = () => {
    const day = new Date()
    day.setHours(0, 0, 0, 0);
    return day;
  }

  const twoWeeks = () => {
    return new Date(Number(endOfDay()) + 12096e5);
  }

  const getDateStyle = (due) => {
    due = Number(due);
    if(due === 0) return false;
    if (due > startOfDay() && due < endOfDay()) {
      return 'due-today';
    } else if (due < startOfDay()) {
      return 'overdue';
    } else if (due < new Date(startOfDay().getTime() + 604800000)) {
      return 'soon';
    }
    return false;
  }

  const initFields = () => {
    const fields = db.fetchFields();
    for(let key in fields) {
      const fieldEl = render.fieldNav(fields[key]);
      fieldEl.addEventListener("click", activate);
      elements.field_links_container.appendChild(fieldEl);
    }
  }

  const initHome = () => {
    elements.field_links_container.innerHTML = '';
    initFields();
    clearContent();
    const home = document.querySelector('.time-link#all');
    home.classList.add('active');
    loadHandler(home);
  }

  const reloadFields = () => {
    const active = document.querySelector('.active');
    elements.field_links_container.innerHTML = '';
    initFields();
    if(!active.classList.contains('time-link')) {
      document.querySelector(`[data-uid='${active.dataset.uid}']`).classList.add('active');
    }
  }

  const reloadContent = () => {
    clearContent();
    const active = document.querySelector('.active');
    loadHandler(active);
  }

  const open_field_form = () => {
    const form = render.new_field_form();
    
    form.querySelector('input.submit_field').addEventListener('click', (e) => {
      const name = form.querySelector('input.field_name').value;
      db.add_field(name)
      elements.new_field_button.disabled = false;
      e.target.parentElement.remove();
      reloadFields();
    })
    
    form.querySelector('input.cancel_field').addEventListener('click', (e) => {
      elements.new_field_button.disabled = false;
      e.target.parentElement.remove();
    })
    
    elements.field_links_container.appendChild(form);
  }

  const assign_head_form_listeners = (form) => {
    form.querySelector('.new-head-init').addEventListener('click', (e) => {
      e.target.style.display = 'none';
      form.querySelector('.form-container').style.display = 'block';
    })

    form.querySelector('input.submit-head').addEventListener('click', (e) => {
      db.add_head(
        e.target.dataset.uid,
        form.querySelector('.head-name').value,
      )
      form.querySelector('.form-container').style.display = 'none';
      form.querySelector('.new-head-init').style.display = 'block';
      reloadContent();
    })

    form.querySelector('.cancel-head').addEventListener('click', (e) => {
      form.querySelector('.form-container').style.display = 'none';
      form.querySelector('.new-head-init').style.display = 'block';
    })
  }

  const loadNewHeadForm = (uid) => {
    const new_head_form = render.new_head_form(uid);
    assign_head_form_listeners(new_head_form);
    elements.content.appendChild(new_head_form);
  }

  const open_field_edit_form = (field) => {
    const edit_form = render.edit_field_form(field);

    edit_form.querySelector('.submit-edit').addEventListener('click', (e) => {
      db.update_item(field.uid, {name : edit_form.querySelector('.edit-field-name').value});
      reloadFields();
      loadField(field.uid);
    })
    edit_form.querySelector('.cancel-edit').addEventListener('click', (e) => {
      loadField(field.uid);
    })
    edit_form.querySelector('.delete-field').addEventListener('click', () => {
      const answer = confirm(`Delete ${field.name}? This will delete all sub-tasks as well.`);
      if(answer) {
        db.remove(field.uid);
        initHome();
      }
    })
    elements.content.prepend(edit_form);
  }

  const loadFieldHeading = (field) => {
    const fieldHeading = render.fieldHeading(field);
    fieldHeading.querySelector('.edit-field').addEventListener('click', (e) => {
      e.target.parentElement.remove();
      open_field_edit_form(field);
    })
    elements.content.prepend(fieldHeading);
  }

  const loadField = (uid) => {
    clearContent();
    const field = db.fetch(uid);
    loadFieldHeading(field);
    for(let key in field.children) {
      loadHead(field.children[key]);
    }
    loadNewHeadForm(uid);
  }

  const update_head = () => {
    let dateValue = document.querySelector('.due-input').valueAsNumber;
    if(isNaN(dateValue)) {
      dateValue = 0;
    } else {
      dateValue = new Date(dateValue).getTime() + 18000000;
    }
    db.update_item(
      document.querySelector('.modal-content').dataset.uid,
      {
        name : document.querySelector('textarea.title').value,
        info : document.querySelector('textarea.info').value,
        due : dateValue,
      }
    )
  }

  const toggle_modal = (update=true) => {
    const modal = document.querySelector('.modal');
    if(modal.style.display === 'block') {
      if(update) update_head();
      reloadContent();
      modal.style.display = 'none';
    } else {
      modal.style.display = 'block';
    }
  }

  const open_head_modal = (head) => {
    elements.modal.innerHTML = '';
    elements.modal.appendChild(render.head_modal(head));
    
    elements.modal.querySelector('button.delete').addEventListener('click', () => {
      const answer = confirm(`Delete ${head.name}?`);
      if(answer) {
        db.remove(head.uid);
        toggle_modal(false);
      }
    })

    elements.modal.querySelector('.project-link').addEventListener('click', (e) => {
      toggle_modal();
      clearActive();
      elements.field_links_container.querySelector(`[data-uid='${e.target.dataset.uid}']`).classList.add('active');
      loadField(e.target.dataset.uid);

    })

    if(getDateStyle(head.due)) {
      elements.modal.querySelector('.due-input').classList.add(getDateStyle(head.due));
    }
    toggle_modal();
  }

  const loadHead = (head) => {
    const tile = render.head_tile(head);
    tile.addEventListener('click', () => {
      open_head_modal(head);
    })
    console.log(head.due);
    if(getDateStyle(head.due)) {
      tile.querySelector('.due-date').classList.add(getDateStyle(head.due));
    }
    elements.content.appendChild(tile);
  }
  
  const loadBatch = (arr) => {
    clearContent();
    arr.forEach(item => loadHead(item));
  }

  // determines which selection of items to pool and load into the content window
  const loadHandler = (target) => {
    if(target.classList.contains('time-link')) {
      switch(target.id) {
        case 'today':
          loadBatch(db.dateQuery(endOfDay()));
          break
        case 'upcoming':
          loadBatch(db.dateQuery(twoWeeks()));
          break
        default:
          loadBatch(db.fetchHeadsByDue());
      }
    }
    else {
      loadField(target.dataset.uid);
    }
  }

  const activate = (e) => {
    if(e.target.classList.contains('active')) return;
    clearActive();
    e.target.classList.add('active');
    loadHandler(e.target);
  }

  // add event listeners to static items

  elements.static_links.forEach(link => {
    link.addEventListener("click", activate);
  })

  elements.new_field_button.addEventListener('click', (e) => {
    open_field_form();
    e.target.disabled = true;
  })

  window.onclick = (e) => {
    if (e.target == elements.modal) {
      toggle_modal();
    }
  } 

  return {
    initFields,
    initHome,
  }
})()

export { controller as default };