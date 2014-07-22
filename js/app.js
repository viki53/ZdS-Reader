
var http = require('http');
var request = require('request');
var localStorage = require('localStorage')
var fs = require('fs');
var tar = require('tar');
var gui = require('nw.gui');
var Notification = require('node-notifier');

document.body.classList.add('current-page-home');

app = {
	set debug (state) {
		this.isDebugActive = state;

		if (!state) {
			if (app.elems.dev_tools_btn) {
				app.elems.dev_tools_btn.parentNode.removeChild(app.elems.dev_tools_btn);
				delete app.elems.dev_tools_btn;
			}
			if (app.elems.refresh_btn) {
				app.elems.refresh_btn.parentNode.removeChild(app.elems.refresh_btn);
				delete app.elems.refresh_btn;
			}
			if (app.elems.debug_buttons) {
				app.elems.debug_buttons.parentNode.removeChild(app.elems.debug_buttons);
				delete app.elems.debug_buttons;
			}
			return;
		}
		else {
			app.elems.debug_buttons = document.createElement('div');
			app.elems.debug_buttons.style.cssText = 'position:fixed; right:0; bottom: 0; z-index: 5000;';

			app.elems.dev_tools_btn = document.createElement('button');
			app.elems.dev_tools_btn.textContent = 'DevTools';
			app.elems.dev_tools_btn.addEventListener('click', app.openDevTools, false);

			app.elems.debug_buttons.appendChild(app.elems.dev_tools_btn);


			app.elems.refresh_btn = document.createElement('button');
			app.elems.refresh_btn.textContent = 'Reload';
			app.elems.refresh_btn.addEventListener('click', function() { window.location.reload() }, false);

			app.elems.debug_buttons.appendChild(app.elems.refresh_btn);

			document.body.appendChild(app.elems.debug_buttons);
			return;
		}
	},
	get debug() {
		return this.isDebugActive;
	},
	isDebugActive: true,

	title: 'ZdS Reader',

	path: './',
	api_url: 'http://zestedesavoir.com/',

	window: gui.Window.get(),
	notifier: new Notification(),

	elems: {
		local_tuts_list: document.getElementById('local-tuts-list'),
		distant_tuts_list: document.getElementById('distant-tuts-list')
	},

	tutorials: JSON.parse(localStorage.getItem('tutorials')) || [],

	local_tutorials_ids: (localStorage.getItem('local_tutorials') || '').split(','),
	local_tutorials: [],

	distant_tutorials_ids: (localStorage.getItem('distant_tutorials') || '').split(','),
	distant_tutorials: [],

	init: function () {
		for (var i=0, nb=app.local_tutorials_ids.length; i<nb; i++) {
			if (app.local_tutorials_ids[i]) {
				app.local_tutorials_ids[i] = parseInt(app.local_tutorials_ids[i]);
			}
			else {
				app.local_tutorials_ids.splice(i, 1);
			}

			var tutorial = app.getTutorial({ id : app.local_tutorials_ids[i] });

			if (tutorial) {
				app.local_tutorials.push(tutorial);
			}
		}

		app.writeTutorialsList(app.elems.local_tuts_list, app.local_tutorials);

		if (!app.elems.local_tuts_list.firstChild) {
			app.elems.local_tuts_empty = document.createElement('p');
			app.elems.local_tuts_empty.className = 'alert-warning list-empty';
			app.elems.local_tuts_empty.textContent = 'Aucun tutoriel local';

			app.elems.local_tuts_list.parentNode.appendChild(app.elems.local_tuts_empty);
		}

		app.refreshLocalTutorials();

		for (var i=0, nb=app.distant_tutorials_ids.length; i<nb; i++) {
			if (app.distant_tutorials_ids[i]) {
				app.distant_tutorials_ids[i] = parseInt(app.distant_tutorials_ids[i]);
			}
			else {
				app.distant_tutorials_ids.splice(i, 1);
			}

			var tutorial = app.getTutorial({ id : app.distant_tutorials_ids[i] });

			if (tutorial) {
				app.distant_tutorials.push(tutorial);
			}
		}

		app.writeTutorialsList(app.elems.distant_tuts_list, app.distant_tutorials);

		if (!app.elems.distant_tuts_list.firstChild) {
			app.elems.distant_tuts_empty = document.createElement('p');
			app.elems.distant_tuts_empty.className = 'alert-error list-empty';
			app.elems.distant_tuts_empty.textContent = 'Aucun tutoriel en ligne';

			app.elems.distant_tuts_list.parentNode.appendChild(app.elems.distant_tuts_empty);
		}
		else {
			for (var i=0, nb=app.elems.distant_tuts_list.childNodes.length; i<nb; i++) {
				var li = app.elems.distant_tuts_list.childNodes[i];
				li.addEventListener('click', app.retrieveTutorial.bind(li, tutorial.id, app.tutorialRetrieveSuccess, app.tutorialRetrieveError), false);
			}
		}

		app.refreshDistantTutorials();


		// app.tray = new gui.Tray({ icon: 'img/icon-18x18.png' });
		// app.tray.title = '';
		// app.tray.tooltip = app.title;

		// var menu = new gui.Menu();
		// menu.append(new gui.MenuItem({ type: 'checkbox', label: 'box1' }));
		// app.tray.menu = menu;
	},

	notify: function(opt) {
		if (!opt.title) {
			opt.title = app.title;
		}
		if (!opt.appIcon) {
			opt.appIcon = app.path + 'img/icon-72x72.png';
		}
		if (!opt.contentImage) {
			opt.contentImage = app.path + 'img/icon-72x72.png';
		}

		app.notifier.notify(opt);
	},

	writeTutorialsList: function (ul, tutorials) {
		while (ul.firstChild) {
			ul.removeChild(ul.firstChild);
		}

		var fragment = document.createDocumentFragment();

		for (var i=0, nb=tutorials.length; i<nb; i++) {
			var li = document.createElement('li');

			app.writeTutorialsListItem(li, tutorials[i]);

			if (!li.firstChild) {
				delete li;
				return;
			}

			fragment.appendChild(li);
		}

		ul.appendChild(fragment);
	},

	writeTutorialsListItem: function (li, tutorial) {
		if (!tutorial) {
			return;
		}

		if (tutorial.id) {
			li.dataset.tutorialId = tutorial.id;
		}
		if (tutorial.title) {
			var title = li.querySelector('h3') || document.createElement('h3');
			title.textContent = tutorial.title;

			li.firstChild ? li.insertBefore(title, li.firstChild) : li.appendChild(title);
		}
		if (tutorial.description) {
			li.title = tutorial.description;
		}
		if (tutorial.type) {
			li.dataset.tutorialType = tutorial.type;
		}
		if (tutorial.tags) {
			li.dataset.tutorialTags = tutorial.tags.join(',');

			var tags = li.querySelector('aside') || document.createElement('aside');
			tags.className = 'tutorial-tags';
			tags.textContent = tutorial.tags.join(', ');

			li.appendChild(tags);
		}
		if (tutorial.license) {
			li.dataset.tutorialLicense = tutorial.license;
		}

		if (tutorial.thumbnail) {
			var thumbnail = li.querySelector('img') || document.createElement('img');
			thumbnail.className = 'tutorial-img';
			thumbnail.src = tutorial.thumbnail;
			thumbnail.alt = '';

			li.firstChild ? li.insertBefore(thumbnail, li.firstChild) : li.appendChild(thumbnail);
		}
		// http://zestedesavoir.com/tutoriels/telecharger/?tutoriel=229
	},

	getTutorial: function (search) {
		loop_1:
		for (var i=0, nb=app.tutorials.length; i<nb; i++) {
			var match = true;
			for (var key in search) {
				if (app.tutorials[i][key] && app.tutorials[i][key] !== search[key]) {
					match = false;
					continue loop_1;
				}
			}
			if (match) {
				return app.tutorials[i];
			}
		}
		return null;
	},

	refreshLocalTutorials: function () {
		fs.readdir(app.path + 'data/tutorials/', function(err, files) {
			if (err) {
				console.error(err);
				return;
			}

			while (app.elems.local_tuts_list.firstChild) {
				app.elems.local_tuts_list.removeChild(app.elems.local_tuts_list.firstChild);
			}

			for (var i=0, nb=files.length; i<nb; i++) {
				var li = document.createElement('li');

				var tut = { id: parseInt(files[i]) };

				var tutorial = app.getTutorial(tut);

				if (!tutorial) {
					tutorial = tut;
					app.local_tutorials.unshift(tutorial);
					app.tutorials.unshift(tutorial);
				}

				app.writeTutorialsListItem(li, tutorial);

				(function(li, tutorial) {
					fs.readFile(app.path + 'data/tutorials/' + files[i] + '/manifest.json', { encoding: 'UTF-8', flag: 'r' },	 function(err, manifest) {
						if (err) {
							console.error(err);
							return;
						}

						manifest = JSON.parse(manifest);

						tutorial.title = manifest.title;
						tutorial.description = manifest.description || "";
						tutorial.type = manifest.type || "N/A";
						tutorial.license = manifest.license || "N/A";
						tutorial.tags = manifest.tags || [];

						app.writeTutorialsListItem(li, tutorial);

						localStorage.setItem('tutorials', JSON.stringify(app.tutorials));
					});
				})(li, tutorial);

				app.elems.local_tuts_list.appendChild(li);
				
				if (app.elems.local_tuts_empty && app.elems.local_tuts_empty.parentNode) {
					app.elems.local_tuts_empty.parentNode.removeChild(app.elems.local_tuts_empty);
					delete app.elems.local_tuts_empty;
				}
			}

			localStorage.setItem('local_tutorials', app.local_tutorials_ids.join(','));
			localStorage.setItem('tutorials', JSON.stringify(app.tutorials));

			if (app.debug) {
				console.info('Tutoriels locaux mis à jour');
			}
		});
	},

	refreshDistantTutorials: function () {
		request.get(app.api_url + 'tutoriels/', function(err, page) {
			if (err) {
				console.error(err);
				return;
			}

			page = page.body.trim();

			var doc = document.implementation.createHTMLDocument('xhr_result');
			doc.documentElement.innerHTML = page;

			var articles = doc.getElementById('content').querySelectorAll('.tutorial-list>article');

			for (var i=articles.length-1; i>=0; i--) {
				var tut = { id: parseInt(articles[i].querySelector('a').getAttribute('href').trim().replace(/\/tutoriels\/([\d]+)\/?(.*)/i, '$1')) };

				var tutorial = app.getTutorial(tut);

				if (!tutorial) {
					tutorial = tut;
					app.distant_tutorials_ids.unshift(tutorial.id);
					app.distant_tutorials.unshift(tutorial);
					app.tutorials.unshift(tutorial);
				}

				tutorial.title = articles[i].querySelector('h3').textContent;
				tutorial.url = articles[i].querySelector('a').getAttribute('href').trim();
				tutorial.thumbnail = articles[i].querySelector('img.tutorial-img').getAttribute('src').replace(/^\/(.*)$/i, app.api_url + '$1');
				tutorial.image = tutorial.thumbnail.replace(/(.60x60_q85_crop.)(png|jpg|gif)$/i, '');
				tutorial.tags = articles[i].querySelector('.article-metadata').textContent.trim().split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
			}

			app.writeTutorialsList(app.elems.distant_tuts_list, app.distant_tutorials);

			for (var i=0, nb=app.elems.distant_tuts_list.childNodes.length; i<nb; i++) {
				var li = app.elems.distant_tuts_list.childNodes[i];

				li.addEventListener('click', app.retrieveTutorial.bind(li, parseInt(li.dataset.tutorialId), app.tutorialRetrieveSuccess, app.tutorialRetrieveError), false);
			}

			if (app.elems.distant_tuts_list.firstChild && app.elems.distant_tuts_empty && app.elems.distant_tuts_empty.parentNode) {
				app.elems.distant_tuts_empty.parentNode.removeChild(app.elems.distant_tuts_empty);
			}

			localStorage.setItem('distant_tutorials', app.distant_tutorials_ids.join(','));
			localStorage.setItem('tutorials', JSON.stringify(app.tutorials));

			if (app.debug) {
				console.info('Tutoriels distants mis à jour');
			}
		});
	},

	downloadFile: function(url, dest, callback, error_callback) {
		var file = fs.createWriteStream(dest);

		http.get(url, function(response) {
			response.pipe(file);

			file.on('finish', function() {
				file.close(callback);
			});
		}).on('error', function(err) {
			fs.unlink(dest);
			if (error_callback) error_callback(err);
		});
	},

	retrieveTutorial: function(tutorial, callback, error_callback) {
		// console.log(arguments);
		// console.log(typeof tutorial);
		// return;

		var id = (typeof tutorial === 'number') ? tutorial : tutorial.id;

		if (!id) {
			return false;
		}

		var url = 'http://zestedesavoir.com/tutoriels/telecharger/?tutoriel=' + id;

		var dest = app.path + 'data/tutorial-' + id + '.tar';

		console.log('Récupération du tutoriel ' + id);

		app.downloadFile(url, dest, function() {
			fs.createReadStream(dest).pipe(tar.Extract({ path: app.path + 'data/tutorials/' + id + '/' })).on('error', function (err) {
				if (error_callback) {
					error_callback(err);
				}
			})
			.on('end', function () {
				fs.unlink(dest);

				if (callback) {
					callback(tutorial);
				}
			});
		}, error_callback);
	},

	tutorialRetrieveSuccess: function(tutorial) {
		console.info('Tutoriel téléchargé');

		app.refreshLocalTutorials();

		if (app.elems.local_tuts_empty && app.elems.local_tuts_empty.parentNode) {
			app.elems.local_tuts_empty.parentNode.removeChild(app.elems.local_tuts_empty);
			delete app.elems.local_tuts_empty;
		}
	},

	tutorialRetrieveError: function(tutorial) {
		console.error('Erreur lors du téléchargement du tutoriel');
	},

	openDevTools: function() {
		app.window.showDevTools();
	}
}

app.init();
app.debug = true;
app.window.setMinimumSize(320, 480);

