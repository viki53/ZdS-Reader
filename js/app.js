
var http = require('http');
var request = require('request');
var localStorage = require('localStorage')
var fs = require('fs');
var markdown = require('markdown').markdown;
var tar = require('tar');
var gui = require('nw.gui');
// var Notification = require('node-notifier');

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
	isDebugActive: false,

	title: 'ZdS Reader',

	path: './',
	api_url: 'http://zestedesavoir.com/',

	page_transition_time: 200,

	window: gui.Window.get(),
	// notifier: new Notification(),

	elems: {
		logo: document.getElementById('logo'),

		home: document.getElementById('home'),
		local_tuts_list: document.getElementById('local-tuts-list'),
		distant_tuts_list: document.getElementById('distant-tuts-list'),

		tutorial: document.getElementById('tutorial'),
		tutorial_title: document.getElementById('tutorial-title'),
		tutorial_description: document.getElementById('tutorial-description'),
		tutorial_content: document.getElementById('tutorial-content'),
	},

	tutorials: [],

	local_tutorials_ids: [],
	local_tutorials: [],

	distant_tutorials_ids: [],
	distant_tutorials: [],

	loaded: false,

	init: function () {
		if (app.loaded) {
			return false;
		}

		app.elems.logo.addEventListener('click', app.showHome, false);

		app.retrieveTutorialsFromStorage();

		/* Tutoriels locaux */

		app.writeTutorialsList(app.elems.local_tuts_list, app.local_tutorials, app.writeLocalTutorialsListItem, app.writeLocalTutorialsListEmpty);

		app.refreshLocalTutorials();

		/* Tutoriels distants */

		app.writeTutorialsList(app.elems.distant_tuts_list, app.distant_tutorials, app.writeDistantTutorialsListItem, app.writeDistantTutorialsListEmpty);

		app.refreshDistantTutorials();
	},

	openDevTools: function() {
		app.window.showDevTools();
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

	addTutorial: function (tutorial, is_local) {
		app.tutorials.unshift(tutorial);

		if (!is_local) {
			app.distant_tutorials.unshift(tutorial);
			app.distant_tutorials_ids.unshift(tutorial.id);
		}
		else {
			app.local_tutorials.unshift(tutorial);
			app.local_tutorials_ids.unshift(tutorial.id);
		}

		return tutorial;
	},

	deleteTutorial: function (tutorial) {
		if (typeof tutorial === 'number') {
			tutorial = app.getTutorial({ id: tutorial });
		}

		if(!tutorial) {
			return false;
		}

		var index = app.tutorials.indexOf(tutorial);

		if (index > -1) {
			var index_local = app.local_tutorials.indexOf(tutorial);
			if (index_local > -1) {
				app.tutorial.splice(index_local, 1);
			}
			var index_local_id = app.local_tutorials_ids.indexOf(tutorial.id);
			if (index_local_id > -1) {
				app.tutorial.splice(index_local_id, 1);
			}

			var index_distant = app.distant_tutorials.indexOf(tutorial);
			if (index_distant > -1) {
				app.tutorial.splice(index_distant, 1);
			}
			var index_distant_id = app.distant_tutorials_ids.indexOf(tutorial.id);
			if (index_distant_id > -1) {
				app.tutorial.splice(index_distant_id, 1);
			}

			app.tutorial.splice(index, 1);
		}
	},

	saveTutorials: function (only) {
		localStorage.setItem('tutorials', JSON.stringify(app.tutorials));

		if (!only || only === 'local') {
			localStorage.setItem('local_tutorials', app.local_tutorials_ids.join(','));
		}
		if (!only || only === 'distant') {
			localStorage.setItem('distant_tutorials', app.distant_tutorials_ids.join(','));
		}
	},

	retrieveTutorialsFromStorage: function (only) {
		app.tutorials = JSON.parse(localStorage.getItem('tutorials')) || [];

		app.local_tutorials_ids = (localStorage.getItem('local_tutorials') || '').split(',');

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

		app.distant_tutorials_ids = (localStorage.getItem('distant_tutorials') || '').split(',');

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
	},

	writeTutorialsList: function (ul, tutorials, li_callback, empty_callback) {
		while (ul.firstChild) {
			ul.removeChild(ul.firstChild);
		}

		if (!tutorials.length) {
			if (empty_callback) {
				empty_callback();
			}
			return false;
		}

		var fragment = document.createDocumentFragment();

		for (var i=0, nb=tutorials.length; i<nb; i++) {
			var li = document.createElement('li');

			app.writeTutorialsListItem(li, tutorials[i]);

			if (!li.firstChild) {
				delete li;
				return;
			}

			if (li_callback) {
				li_callback(li, tutorials[i]);
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
			var title = li.querySelector('h3');

			if (!title) {
				title = document.createElement('h3');

				li.firstChild ? li.insertBefore(title, li.firstChild) : li.appendChild(title);
			}
			title.textContent = tutorial.title;
		}
		if (tutorial.description) {
			li.title = tutorial.description;
		}
		if (tutorial.type) {
			li.dataset.tutorialType = tutorial.type;
		}
		if (tutorial.tags) {
			li.dataset.tutorialTags = tutorial.tags.join(',');

			var tags = li.querySelector('aside.tutorial-tags');

			if (!tags) {
				tags = document.createElement('aside');
				tags.className = 'tutorial-tags';

				li.appendChild(tags);
			}

			tags.textContent = tutorial.tags.join(', ');
		}
		if (tutorial.license) {
			li.dataset.tutorialLicense = tutorial.license;
		}

		if (tutorial.thumbnail) {
			var thumbnail = li.querySelector('img.tutorial-img');

			if(!thumbnail) {
				thumbnail = document.createElement('img');
				thumbnail.className = 'tutorial-img';
				thumbnail.alt = '';

				li.firstChild ? li.insertBefore(thumbnail, li.firstChild) : li.appendChild(thumbnail);
			}
			thumbnail.src = tutorial.thumbnail;
		}
	},

	writeLocalTutorialsListItem: function(li, tutorial) {
		li.addEventListener('click', app.showTutorial.bind(li, tutorial), false);
	},

	writeDistantTutorialsListItem: function(li, tutorial) {
		li.addEventListener('click', app.retrieveTutorial.bind(li, tutorial, app.tutorialRetrieveSuccess, app.tutorialRetrieveError), false);
	},

	writeLocalTutorialsListEmpty: function() {
		if (!app.elems.local_tuts_list.firstChild) {
			app.elems.local_tuts_empty = document.createElement('p');
			app.elems.local_tuts_empty.className = 'alert-warning list-empty';
			app.elems.local_tuts_empty.textContent = 'Aucun tutoriel local';

			app.elems.local_tuts_list.parentNode.appendChild(app.elems.local_tuts_empty);
		}
		else {
			if (app.elems.local_tuts_empty) {
				if (app.elems.local_tuts_empty.parentNode) {
					app.elems.local_tuts_empty.parentNode.removeChild(app.elems.local_tuts_empty);
				}
				delete app.elems.local_tuts_empty;
			}
		}
	},

	writeDistantTutorialsListEmpty: function() {
		if (!app.elems.distant_tuts_list.firstChild) {
			app.elems.distant_tuts_empty = document.createElement('p');
			app.elems.distant_tuts_empty.className = 'alert-warning list-empty';
			app.elems.distant_tuts_empty.textContent = 'Aucun tutoriel distant';

			app.elems.distant_tuts_list.parentNode.appendChild(app.elems.distant_tuts_empty);
		}
		else {
			if (app.elems.distant_tuts_empty) {
				if (app.elems.distant_tuts_empty.parentNode) {
					app.elems.distant_tuts_empty.parentNode.removeChild(app.elems.distant_tuts_empty);
				}
				delete app.elems.distant_tuts_empty;
			}
		}
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
				var file_stats = fs.statSync(app.path + 'data/tutorials/' + files[i]);

				if (!file_stats.isDirectory()) {
					continue;
				}

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

						tutorial.title = manifest.title || tutorial.title;
						tutorial.description = manifest.description || tutorial.description || "";
						tutorial.type = manifest.type || tutorial.type || "N/A";
						tutorial.license = manifest.license || tutorial.license || "N/A";
						tutorial.tags = manifest.tags || tutorial.tags || [];

						app.writeTutorialsListItem(li, tutorial);
						app.writeLocalTutorialsListItem(li, tutorial);

						app.writeLocalTutorialsListEmpty();

						app.saveTutorials('none');
					});
				})(li, tutorial);

				app.elems.local_tuts_list.appendChild(li);
			}

			app.writeLocalTutorialsListEmpty();

			app.saveTutorials('local');

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

				var tutorial = app.parseDistantTutorial(articles[i]);
			}

			app.writeTutorialsList(app.elems.distant_tuts_list, app.distant_tutorials, app.writeDistantTutorialsListItem, app.writeDistantTutorialsListEmpty);

			if (app.elems.distant_tuts_list.firstChild && app.elems.distant_tuts_empty && app.elems.distant_tuts_empty.parentNode) {
				app.elems.distant_tuts_empty.parentNode.removeChild(app.elems.distant_tuts_empty);
			}

			app.saveTutorials('distant');

			if (app.debug) {
				console.info('Tutoriels distants mis à jour');
			}
		});
	},

	parseDistantTutorial: function(article) {
		var tut = { id: parseInt(article.querySelector('a').getAttribute('href').trim().replace(/\/tutoriels\/([\d]+)\/?(.*)/i, '$1')) };

		var tutorial = app.getTutorial(tut);

		if (!tutorial) {
			tutorial = app.addTutorial(tut);
		}

		tutorial.title = article.querySelector('h3').textContent || tutorial.title || "";
		tutorial.url = article.querySelector('a').getAttribute('href').trim() || tutorial.url || "";
		tutorial.thumbnail = article.querySelector('img.tutorial-img').getAttribute('src').replace(/^\/(.*)$/i, app.api_url + '$1') || tutorial.thumbnail || "";
		tutorial.image = tutorial.thumbnail.replace(/(.60x60_q85_crop.)(png|jpg|gif)$/i, '') || tutorial.image || "";
		tutorial.tags = article.querySelector('.article-metadata').textContent.trim().split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; }) || tutorial.tags || "";

		return tutorial;
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
				try{
					fs.unlinkSync(dest);
				}
				catch(err) {
					console.error(err);
				}

				if (callback) {
					callback(tutorial);
				}
			});
		}, error_callback);

		if (this && this.classList) {
			this.classList.add('loading');
		}
	},

	tutorialRetrieveSuccess: function(tutorial) {
		console.info('Tutoriel téléchargé');

		app.refreshLocalTutorials();

		console.dir();

		if (typeof tutorial !== 'object') {
			tutorial = app.getTutorial({ id: tutorial });
		}
		if (!tutorial) {
			return false;
		}

		app.addTutorial(tutorial, true);

		app.writeTutorialsList(app.elems.local_tuts_list, app.local_tutorials, app.writeLocalTutorialsListItem, app.writeLocalTutorialsListEmpty);

		var li = app.elems.distant_tuts_list.querySelector('li[data-tutorial-id="' + tutorial.id + '"]');
		console.dir(li);
		if (li && li.classList) {
			li.classList.remove('loading');
		}
	},

	tutorialRetrieveError: function(tutorial) {
		console.error('Erreur lors du téléchargement du tutoriel');
	},

	showHome: function(event) {
		if (event && event.preventDefault) {
			event.preventDefault();
		}

		document.body.classList.remove('current-page-tutorial');
		app.clearTutorialPage();

		document.body.classList.add('current-page-home');

		app.refreshLocalTutorials();
		app.refreshDistantTutorials();
	},

	showTutorial: function(tutorial) {
		document.body.classList.remove('current-page-home');
		document.body.classList.add('current-page-tutorial');

		(function(tutorial) {
			fs.readFile(app.path + 'data/tutorials/' + tutorial.id + '/manifest.json', { encoding: 'UTF-8', flag: 'r' },	 function(err, manifest) {
				if (err) {
					console.error(err);
					return;
				}

				manifest = JSON.parse(manifest);

				tutorial.title = manifest.title || tutorial.title;
				tutorial.description = manifest.description || tutorial.description || '';
				tutorial.type = manifest.type || tutorial.type || 'N/A';
				tutorial.license = manifest.license || tutorial.license || 'N/A';
				tutorial.tags = manifest.tags || tutorial.tags || [];

				app.writeTutorialPage(tutorial, manifest);

				app.saveTutorials('none');
			});
		})(tutorial);

		app.writeTutorialPage(tutorial);
	},

	fixTutorialMarkdown: function(str) {
		return str.replace(/src=\"\/([^"]+)\"/gi, 'src="' + app.api_url + '$1"');
	},

	writeTutorialPage: function(tutorial, manifest) {
		if (app.debug) {
			console.info('Page tutoriel ' + tutorial.id);
		}

		app.elems.tutorial_title.textContent = tutorial.title;
		app.elems.tutorial_description.textContent = tutorial.description || '';

		if (manifest) {
			var tutorial_content = {
				title: tutorial.title,
				description: tutorial.description,
				introduction: '',
				conclusion: '',
				files_to_load: 0,
				files_loaded: 0
			};

			if (manifest.introduction) {
				tutorial_content.files_to_load++;

				app.loadTutorialFragment(tutorial, manifest.introduction, function (content) {
					tutorial_content.introduction = app.fixTutorialMarkdown(markdown.toHTML(content));

					tutorial_content.files_loaded++;

					app.writeTutorialContent(tutorial_content);
				});
			}

			if (manifest.parts) {
				tutorial_content.parts = [];

				for (var i=0, nb=manifest.parts.length; i<nb; i++) {
					tutorial_content.parts[i] = {
						title: manifest.parts[i].title,
						introduction: '',
						chapters: [],
						conclusion: ''
					};

					app.loadTutorialPart(tutorial, tutorial_content, manifest.parts[i], tutorial_content.parts[i], function() {
						app.writeTutorialContent(tutorial_content);
					});
				}
			}
			else if (manifest.chapters) {
				tutorial_content.chapters = [];

				for (var i=0, nb=manifest.chapters.length; i<nb; i++) {
					tutorial_content.chapters[i] = {
						title: manifest.chapters[i].title,
						introduction: '',
						extracts: [],
						conclusion: ''
					};

					app.loadTutorialChapter(tutorial, tutorial_content, manifest.chapters[i], tutorial_content.chapters[i], function() {
						app.writeTutorialContent(tutorial_content);
					});
				}
			}
			else if (manifest.chapter && manifest.chapter.extracts) {
				tutorial_content.chapter = {
					extracts: [],
				};

				for (var i=0, nb=manifest.chapter.extracts.length; i<nb; i++) {
					tutorial_content.chapter.extracts[i] = {
						title: manifest.chapter.extracts[i].title,
						content: ''
					};

					app.loadTutorialExtract(tutorial, tutorial_content, manifest.chapter.extracts[i], tutorial_content.chapter.extracts[i], function() {
						app.writeTutorialContent(tutorial_content);
					});
				}
			}

			if (manifest.conclusion) {
				tutorial_content.files_to_load++;
				
				app.loadTutorialFragment(tutorial, manifest.conclusion, function (content) {
					tutorial_content.conclusion = app.fixTutorialMarkdown(markdown.toHTML(content));
					tutorial_content.files_loaded++;

					app.writeTutorialContent(tutorial_content);
				});
			}
		}
	},

	clearTutorialPage: function() {
		app.elems.tutorial_title.textContent = '';
		app.elems.tutorial_description.textContent = '';

		while (app.elems.tutorial_content.firstChild) {
			app.elems.tutorial_content.removeChild(app.elems.tutorial_content.firstChild);
		}
	},

	writeTutorialContent: function(tutorial_content) {
		if (app.debug) {
			console.info('Écriture tutoriel = "' + tutorial_content.title + '"');
		}
		if (tutorial_content.files_loaded < tutorial_content.files_to_load) {
			if (app.debug) {
				console.log('Tous les fichiers ne sont pas chargés (' + tutorial_content.files_loaded + '/' + tutorial_content.files_to_load + ')');
			}
			return false;
		}

		while (app.elems.tutorial_content.firstChild) {
			app.elems.tutorial_content.removeChild(app.elems.tutorial_content.firstChild);
		}

		var tut_fragment = document.createDocumentFragment();

		var tut_introduction = document.createElement('header');
		tut_introduction.className = 'tutorial-introduction';
		tut_introduction.innerHTML = tutorial_content.introduction;
		tut_fragment.appendChild(tut_introduction);

		if (tutorial_content.parts) {
			for (var i=0, nb=tutorial_content.parts.length; i<nb; i++) {
				var tut_part = app.writeTutorialPart(tutorial_content.parts[i]);
				tut_fragment.appendChild(tut_part);
			}
		}
		else if (tutorial_content.chapters) {
			for (var i=0, nb=tutorial_content.chapters.length; i<nb; i++) {
				var tut_chapter = app.writeTutorialChapter(tutorial_content.chapters[i]);
				tut_fragment.appendChild(tut_chapter);
			}
		}
		else if (tutorial_content.chapter && tutorial_content.chapter.extracts) {
			for (var i=0, nb=tutorial_content.chapter.extracts.length; i<nb; i++) {
				var tut_extract = app.writeTutorialExtract(tutorial_content.chapter.extracts[i]);
				tut_fragment.appendChild(tut_extract);
			}
		}

		var tut_conclusion = document.createElement('footer');
		tut_introduction.className = 'tutorial-conclusion';
		tut_conclusion.innerHTML = tutorial_content.conclusion;
		tut_fragment.appendChild(tut_conclusion);

		app.elems.tutorial_content.appendChild(tut_fragment);
	},

	writeTutorialPart: function (part) {
		var tut_part = document.createElement('article');
		tut_part.className = 'tutorial-part';

		var tut_part_introduction = document.createElement('header');
		tut_part_introduction.className = 'tutorial-part-introduction';
		tut_part_introduction.innerHTML = part.introduction;
		tut_part.appendChild(tut_part_introduction);

		for (var i=0, nb=part.chapters.length; i<nb; i++) {
			var tut_chapter = app.writeTutorialChapter(part.chapters[i], true);
			tut_part.appendChild(tut_chapter);
		}

		var tut_part_conclusion = document.createElement('footer');
		tut_part_conclusion.className = 'tutorial-part-conclusion';
		tut_part_conclusion.innerHTML = part.conclusion;
		tut_part.appendChild(tut_part_conclusion);

		return tut_part;
	},

	writeTutorialChapter: function (chapter, within_part) {
		var tut_chapter = document.createElement(within_part ? 'section' : 'article');
		tut_chapter.className = 'tutorial-chapter';

		var tut_chapter_introduction = document.createElement('header');
		tut_chapter_introduction.className = 'tutorial-chapter-introduction';
		tut_chapter_introduction.innerHTML = chapter.introduction;
		tut_chapter.appendChild(tut_chapter_introduction);

		for (var i=0, nb=chapter.extracts.length; i<nb; i++) {
			var tut_extract = app.writeTutorialExtract(chapter.extracts[i]);
			tut_chapter.appendChild(tut_extract);
		}

		var tut_chapter_conclusion = document.createElement('footer');
		tut_chapter_conclusion.className = 'tutorial-chapter-conclusion';
		tut_chapter_conclusion.innerHTML = chapter.conclusion;
		tut_chapter.appendChild(tut_chapter_conclusion);

		return tut_chapter;
	},

	writeTutorialExtract: function (extract, within_part) {
		var tut_extract = document.createElement('section');
		tut_extract.className = 'tutorial-extract';
		tut_extract.innerHTML = extract.content;

		return tut_extract;
	},

	loadTutorialFragment: function(tutorial, fragment, callback) {
		console.dir(arguments);
		fs.readFile(app.path + 'data/tutorials/' + tutorial.id + '/' + fragment, { encoding: 'UTF-8', flag: 'r' },	 function(err, content) {
			if (err) {
				console.error(err);
				return;
			}

			callback(content);
		});
	},

	loadTutorialPart: function(tutorial, tutorial_content, part, part_content, callback) {
		if (app.debug) {
			console.info('Chargement partie ' + part.pk);
		}

		if (part.introduction) {
			tutorial_content.files_to_load++;
			
			app.loadTutorialFragment(tutorial, part.introduction, function(content) {
				part_content.introduction = app.fixTutorialMarkdown(markdown.toHTML(content));
				tutorial_content.files_loaded++;
				callback();
			});
		}

		for (var i=0, nb=part.chapters.length; i<nb; i++) {
			part_content.chapters[i] = {
				title: part.chapters[i].title,
				introduction: '',
				extracts: [],
				conclusion: ''
			};

			app.loadTutorialChapter(tutorial, tutorial_content, part.chapters[i], part_content.chapters[i], callback);
		}

		if (part.conclusion) {
			tutorial_content.files_to_load++;
			
			app.loadTutorialFragment(tutorial, part.conclusion, function(content) {
				part_content.conclusion = app.fixTutorialMarkdown(markdown.toHTML(content));
				tutorial_content.files_loaded++;
				callback();
			});
		}
	},

	loadTutorialChapter: function(tutorial, tutorial_content, chapter, chapter_content, callback) {
		if (app.debug) {
			console.info('Chargement chapitre ' + chapter.pk);
		}

		if (chapter.introduction) {
			tutorial_content.files_to_load++;
			
			app.loadTutorialFragment(tutorial, chapter.introduction, function(content) {
				chapter_content.introduction = app.fixTutorialMarkdown(markdown.toHTML(content));
				tutorial_content.files_loaded++;
				callback();
			});
		}

		for (var i=0, nb=chapter.extracts.length; i<nb; i++) {
			chapter_content.extracts[i] = {
				title: chapter.extracts[i].title,
				content: ''
			};

			app.loadTutorialExtract(tutorial, tutorial_content, chapter.extracts[i], chapter_content.extracts[i], callback);
		}

		if (chapter.conclusion) {
			tutorial_content.files_to_load++;
			
			app.loadTutorialFragment(tutorial, chapter.conclusion, function(content) {
				chapter_content.conclusion = app.fixTutorialMarkdown(markdown.toHTML(content));
				tutorial_content.files_loaded++;
				callback();
			});
		}
	},

	loadTutorialExtract: function(tutorial, tutorial_content, extract, extract_content, callback) {
		if (app.debug) {
			console.info('Chargement extrait ' + extract.pk);
		}

		tutorial_content.files_to_load++;

		app.loadTutorialFragment(tutorial, extract.text, function(content) {
			extract_content.content = app.fixTutorialMarkdown(markdown.toHTML(content));
			
			tutorial_content.files_loaded++;

			callback();
		});
	}
}

app.init();
app.showHome();
app.debug = true;
app.window.setMinimumSize(320, 480);

