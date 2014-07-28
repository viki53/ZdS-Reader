
var http = require('http');
var request = require('request');
var localStorage = require('localStorage');
var fs = require('fs');

var hljs = require("highlight.js");
var showdown_converter = new Showdown.converter({ extensions: ['github', 'table', 'math', 'footnotes', 'zds'] });

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

		tutorial_summary: document.getElementById('tutorial-summary'),
		tutorial_title: document.getElementById('tutorial-title'),
		tutorial_description: document.getElementById('tutorial-description'),
		tutorial_summary_content: document.getElementById('tutorial-summary-content'),

		tutorial_extract: document.getElementById('tutorial-extract'),
		tutorial_extract_title: document.getElementById('tutorial-extract-title'),
		tutorial_extract_content: document.getElementById('tutorial-extract-content'),
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
		document.getElementById('topbar-home-download-tutorial').addEventListener('click', app.downloadTutorial, false);

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
			app.elems.local_tuts_empty.className = 'warning list-empty';
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
			app.elems.distant_tuts_empty.className = 'warning list-empty';
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

	downloadTutorial: function() {
		var prompt_tutorial_id = '';
		var regexp_integer = /^([\d]+)$/i;
		var regexp_url_tutorial = /(?:(?:http\:|https\:|)\/\/(?:www\.)?zestedesavoir\.com)?\/tutoriels\/(?:off\/)?([\d]+)\/(?:.*)/i;

		do {
			var prompt_tutorial_id = prompt('URL ou ID du tutoriel', prompt_tutorial_id);

			prompt_tutorial_id.replace(regexp_url_tutorial, function() {
				console.dir(arguments);
				return this;
			})
			if (prompt_tutorial_id.match(regexp_integer)) {
				var tutorial_id = parseInt(prompt_tutorial_id, 10);
			}
			else if (prompt_tutorial_id.match(regexp_url_tutorial)) {
				var tutorial_id = parseInt(prompt_tutorial_id.replace(regexp_url_tutorial, '$1'), 10);
				console.log(prompt_tutorial_id);
				console.log(tutorial_id);
			}
		} while (prompt_tutorial_id !== null && !tutorial_id);

		if (tutorial_id) {
			app.retrieveTutorial(tutorial_id, app.tutorialRetrieveSuccess, app.tutorialRetrieveError);
		}
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

		if (document.body.classList.remove('current-page-tutorial-summary') ) {
			app.clearTutorialSummaryPage();
		}
		if (document.body.classList.remove('current-page-tutorial-extract') ) {
			app.clearTutorialExtractPage();
		}

		document.body.classList.add('current-page-home');

		app.refreshLocalTutorials();
		app.refreshDistantTutorials();
	},

	showTutorial: function(tutorial) {
		document.body.classList.remove('current-page-home');
		document.body.classList.remove('current-page-tutorial-extract');
		document.body.classList.add('current-page-tutorial-summary');

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

				app.writeTutorialSummaryPage(tutorial, manifest);

				app.saveTutorials('none');
			});
		})(tutorial);

		app.writeTutorialSummaryPage(tutorial);
	},

	parseMarkdown: function(str) {
		return showdown_converter.makeHtml(str).replace(/(src|href)=\"\/([^"]+)\"/gi, '$1="' + app.api_url + '$2"');
	},

	writeTutorialSummaryPage: function(tutorial, manifest) {
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
					tutorial_content.introduction = app.parseMarkdown(content);

					tutorial_content.files_loaded++;

					app.elems.tutorial_summary_content.appendChild(app.writeTutorialSummary(tutorial, tutorial_content, manifest));
				});
			}

			if (manifest.parts) {
				tutorial_content.parts = [];

				for (var i=0, nb_i=manifest.parts.length; i<nb_i; i++) {
					tutorial_content.parts[i] = {
						title: manifest.parts[i].title,
						introduction: '',
						chapters: [],
						conclusion: ''
					};

					if (manifest.parts[i].chapters) {
						for (var j=0, nb_j=manifest.parts[i].chapters.length; j<nb_j; j++) {
							tutorial_content.parts[i].chapters[j] = {
								title: manifest.parts[i].chapters[j].title,
								introduction: '',
								extracts: [],
								conclusion: ''
							};

							if (manifest.parts[i].chapters[j].extracts) {
								for (var k=0, nb_k=manifest.parts[i].chapters[j].extracts.length; k<nb_k; k++) {
									tutorial_content.parts[i].chapters[j].extracts[k] = {
										title: manifest.parts[i].chapters[j].extracts[k].title,
										content: ''
									};
								}
							}
						}
					}
				}
			}
			else if (manifest.chapters) {
				tutorial_content.chapters = [];

				for (var i=0, nb_i=manifest.chapters.length; i<nb_i; i++) {
					tutorial_content.chapters[i] = {
						title: manifest.chapters[i].title,
						introduction: '',
						extracts: [],
						conclusion: ''
					};

					if (manifest.chapters[i].extracts) {
						for (var j=0, nb_j=manifest.chapters[i].extracts.length; j<nb_j; j++) {
							tutorial_content.chapters[i].extracts[j] = {
								title: manifest.chapters[i].extracts[j].title,
								content: ''
							};
						}
					}
				}
			}
			else if (manifest.chapter && manifest.chapter.extracts) {
				tutorial_content.chapter = {
					title: manifest.chapter.title,
					extracts: [],
				};

				for (var i=0, nb_i=manifest.chapter.extracts.length; i<nb_i; i++) {
					tutorial_content.chapter.extracts[i] = {
						title: manifest.chapter.extracts[i].title,
						content: ''
					};
				}
			}

			if (manifest.conclusion) {
				tutorial_content.files_to_load++;
				
				app.loadTutorialFragment(tutorial, manifest.conclusion, function (content) {
					tutorial_content.conclusion = app.parseMarkdown(content);
					tutorial_content.files_loaded++;

					app.elems.tutorial_summary_content.appendChild(app.writeTutorialSummary(tutorial, tutorial_content, manifest));
				});
			}

			app.elems.tutorial_summary_content.appendChild(app.writeTutorialSummary(tutorial, tutorial_content, manifest));
		}
	},

	clearTutorialSummaryPage: function() {
		app.elems.tutorial_title.textContent = '';
		app.elems.tutorial_description.textContent = '';

		app.clearTutorialSummaryContent();
	},

	clearTutorialSummaryContent: function() {
		while (app.elems.tutorial_summary_content.firstChild) {
			app.elems.tutorial_summary_content.removeChild(app.elems.tutorial_summary_content.firstChild);
		}
	},

	writeTutorialSummary: function(tutorial, tutorial_content, manifest) {
		if (app.debug) {
			console.info('Écriture plan tutoriel', tutorial_content);
		}

		app.clearTutorialSummaryContent();

		var tut_fragment = document.createDocumentFragment();

		var tut_introduction = document.createElement('header');
		tut_introduction.className = 'tutorial-introduction markdown-content';
		tut_introduction.innerHTML = tutorial_content.introduction;
		tut_fragment.appendChild(tut_introduction);

		var title_level = 1;

		if (tutorial_content.parts) {
			var list_parts = document.createElement('ol');

			for (var i=0, nb=tutorial_content.parts.length; i<nb; i++) {
				var tut_part = app.writeTutorialSummaryPart(tutorial, tutorial_content, manifest.parts[i], tutorial_content.parts[i], title_level);
				list_parts.appendChild(tut_part);
			}
			tut_fragment.appendChild(list_parts);
		}
		else if (tutorial_content.chapters) {
			var list_chapters = document.createElement('ol');

			for (var i=0, nb=tutorial_content.chapters.length; i<nb; i++) {
				var tut_chapter = app.writeTutorialSummaryChapter(tutorial, tutorial_content, manifest.chapters[i], tutorial_content.chapters[i], title_level);
				list_chapters.appendChild(tut_chapter);
			}
			tut_fragment.appendChild(list_chapters);
		}
		else if (tutorial_content.chapter) {
			var list_extracts = document.createElement('ol');

			for (var i=0, nb=tutorial_content.chapter.extracts.length; i<nb; i++) {
				var tut_extract = app.writeTutorialSummaryExtract(tutorial, tutorial_content, manifest.chapter.extracts[i], tutorial_content.chapter.extracts[i], title_level);
				list_extracts.appendChild(tut_extract);
			}
			tut_fragment.appendChild(list_extracts);
		}

		var tut_conclusion = document.createElement('footer');
		tut_introduction.className = 'tutorial-conclusion markdown-content';
		tut_conclusion.innerHTML = tutorial_content.conclusion;
		tut_fragment.appendChild(tut_conclusion);

		var codes = tut_fragment.querySelectorAll('pre>code');
		Array.prototype.forEach.call(codes, function(block) {
			hljs.highlightBlock(block);
		});

		return tut_fragment;
	},

	writeTutorialSummaryPart: function(tutorial, tutorial_content, part, part_content, title_level) {
		var tut_part = document.createElement('li');

		if (part_content.title) {
			var title = document.createElement('h' + title_level);
			title.textContent = part_content.title;
			title.addEventListener('click', app.showTutorialPart.bind(title, tutorial, tutorial_content, part, part_content), false);
			tut_part.appendChild(title);
		}

		if (part_content.chapters) {
			title_level++;
			var list_chapters = document.createElement('ol');

			for (var i=0, nb=part_content.chapters.length; i<nb; i++) {
				var tut_chapter = app.writeTutorialSummaryChapter(tutorial, tutorial_content, part.chapters[i], part_content.chapters[i], title_level);
				list_chapters.appendChild(tut_chapter);
			}
			tut_part.appendChild(list_chapters);
		}

		return tut_part;
	},

	writeTutorialSummaryChapter: function(tutorial, tutorial_content, chapter, chapter_content, title_level) {
		var tut_chapter = document.createElement('li');

		if (chapter_content.title) {
			var title = document.createElement('h' + title_level);
			title.textContent = chapter_content.title;
			title.addEventListener('click', app.showTutorialChapter.bind(title, tutorial, tutorial_content, chapter, chapter_content), false);
			tut_chapter.appendChild(title);
		}

		if (chapter_content.extracts) {
			title_level++;
			var list_extracts = document.createElement('ol');

			for (var i=0, nb=chapter_content.extracts.length; i<nb; i++) {
				var tut_extract = app.writeTutorialSummaryExtract(tutorial, tutorial_content, chapter.extracts[i], chapter_content.extracts[i], title_level);
				list_extracts.appendChild(tut_extract);
			}
			tut_chapter.appendChild(list_extracts);
		}

		return tut_chapter;
	},

	writeTutorialSummaryExtract: function(tutorial, tutorial_content, extract, extract_content, title_level) {
		var tut_extract = document.createElement('li');

		if (extract_content.title) {
			var title = document.createElement('h' + title_level);
			title.textContent = extract_content.title;
			title.addEventListener('click', app.showTutorialExtract.bind(title, tutorial, tutorial_content, extract, extract_content), false);
			tut_extract.appendChild(title);
		}

		return tut_extract;
	},

	clearTutorialExtractPage: function() {
		app.elems.tutorial_extract_title.textContent = '';

		app.clearTutorialExtractContent();
	},

	clearTutorialExtractContent: function() {
		while (app.elems.tutorial_extract_content.firstChild) {
			app.elems.tutorial_extract_content.removeChild(app.elems.tutorial_extract_content.firstChild);
		}
	},

	showTutorialPart: function(tutorial, tutorial_content, part, part_content) {
		if (app.debug) {
			console.log('showTutorialPart', tutorial, part_content);
		}

		app.clearTutorialExtractPage();

		document.body.className = 'current-page-tutorial-extract';

		app.elems.tutorial_extract_title.textContent = part_content.title;

		var tut_part = document.createDocumentFragment();

		var back_to_summary = document.createElement('button');
		back_to_summary.textContent = 'Retour au sommaire';
		back_to_summary.addEventListener('click', app.showTutorial.bind(back_to_summary, tutorial), false);
		tut_part.appendChild(back_to_summary);

		app.loadTutorialFragment(tutorial, part.introduction, function(content) {
			part_content.introduction = app.parseMarkdown(content);

			var tut_part_content = app.writeTutorialChapter(tutorial, tutorial_content, part, part_content);

			tut_part.appendChild(tut_part_content);
			
			app.elems.tutorial_extract_content.appendChild(tut_part);
		});
		app.loadTutorialFragment(tutorial, part.conclusion, function(content) {
			part_content.conclusion = app.parseMarkdown(content);

			var tut_part_content = app.writeTutorialChapter(tutorial, tutorial_content, part, part_content);

			tut_part.appendChild(tut_part_content);
			
			app.elems.tutorial_extract_content.appendChild(tut_part);
		});

		app.elems.tutorial_extract_content.appendChild(tut_part);
	},

	showTutorialChapter: function(tutorial, tutorial_content, chapter, chapter_content) {
		if (app.debug) {
			console.log('showTutorialChapter', tutorial, chapter_content);
		}

		app.clearTutorialExtractPage();

		document.body.className = 'current-page-tutorial-extract';

		app.elems.tutorial_extract_title.textContent = chapter_content.title;
		
		var tut_chapter = document.createDocumentFragment();

		var back_to_summary = document.createElement('button');
		back_to_summary.textContent = 'Retour au sommaire';
		back_to_summary.addEventListener('click', app.showTutorial.bind(back_to_summary, tutorial), false);
		tut_chapter.appendChild(back_to_summary);

		app.loadTutorialFragment(tutorial, chapter.introduction, function(content) {
			chapter_content.introduction = app.parseMarkdown(content);

			var tut_chapter_content = app.writeTutorialChapter(tutorial, tutorial_content, chapter, chapter_content);

			tut_chapter.appendChild(tut_chapter_content);
			
			app.elems.tutorial_extract_content.appendChild(tut_chapter);
		});
		app.loadTutorialFragment(tutorial, chapter.conclusion, function(content) {
			chapter_content.conclusion = app.parseMarkdown(content);

			var tut_chapter_content = app.writeTutorialChapter(tutorial, tutorial_content, chapter, chapter_content);

			tut_chapter.appendChild(tut_chapter_content);
			
			app.elems.tutorial_extract_content.appendChild(tut_chapter);
		});

		app.elems.tutorial_extract_content.appendChild(tut_chapter);
	},

	showTutorialExtract: function(tutorial, tutorial_content, extract, extract_content) {
		if (app.debug) {
			console.log('showTutorialExtract', tutorial, extract_content);
		}

		app.clearTutorialExtractPage();

		document.body.className = 'current-page-tutorial-extract';

		app.elems.tutorial_extract_title.textContent = extract_content.title;
		
		var tut_extract = document.createDocumentFragment();

		var back_to_summary = document.createElement('button');
		back_to_summary.textContent = 'Retour au sommaire';
		back_to_summary.addEventListener('click', app.showTutorial.bind(back_to_summary, tutorial), false);
		tut_extract.appendChild(back_to_summary);

		app.loadTutorialFragment(tutorial, extract.text, function(content) {
			extract_content.content = app.parseMarkdown(content);

			var tut_extract_content = app.writeTutorialExtract(tutorial, tutorial_content, extract, extract_content);

			tut_extract.appendChild(tut_extract_content);

			app.elems.tutorial_extract_content.appendChild(tut_extract);
		});

		app.elems.tutorial_extract_content.appendChild(tut_extract);
	},

	writeTutorialContent: function(tutorial, tutorial_content) {
		if (app.debug) {
			console.info('Écriture tutoriel', tutorial_content);
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
		tut_introduction.className = 'tutorial-introduction markdown-content';
		tut_introduction.innerHTML = tutorial_content.introduction;
		tut_fragment.appendChild(tut_introduction);

		if (tutorial_content.parts) {
			for (var i=0, nb=tutorial_content.parts.length; i<nb; i++) {
				var tut_part = app.writeTutorialPart(tutorial, tutorial_content, tutorial.parts[i], tutorial_content.parts[i]);
				tut_fragment.appendChild(tut_part);
			}
		}
		else if (tutorial_content.chapters) {
			for (var i=0, nb=tutorial_content.chapters.length; i<nb; i++) {
				var tut_chapter = app.writeTutorialChapter(tutorial, tutorial_content, tutorial.chapters[i], tutorial_content.chapters[i]);
				tut_fragment.appendChild(tut_chapter);
			}
		}
		else if (tutorial_content.chapter && tutorial_content.chapter.extracts) {
			for (var i=0, nb=tutorial_content.chapter.extracts.length; i<nb; i++) {
				var tut_extract = app.writeTutorialExtract(tutorial, tutorial_content, tutorial.chapter.extracts[i], tutorial_content.chapter.extracts[i]);
				tut_fragment.appendChild(tut_extract);
			}
		}

		var tut_conclusion = document.createElement('footer');
		tut_introduction.className = 'tutorial-conclusion markdown-content';
		tut_conclusion.innerHTML = tutorial_content.conclusion;
		tut_fragment.appendChild(tut_conclusion);

		var codes = tut_fragment.querySelectorAll('pre>code');
		Array.prototype.forEach.call(codes, function(block) {
			// hljs.highlightBlock(block);
		});

		app.elems.tutorial_content.appendChild(tut_fragment);
	},

	writeTutorialPart: function (tutorial, tutorial_content, part, part_content, title_level) {
		var tut_part = document.createElement('article');
		tut_part.className = 'tutorial-part';

		var tut_part_header = document.createElement('header');

		var tut_part_title = document.createElement('h1');
		tut_part_title.innerHTML = part_content.title;
		tut_part_header.appendChild(tut_part_title);

		var tut_part_introduction = document.createElement('div');
		tut_part_introduction.className = 'tutorial-part-introduction markdown-content';
		tut_part_introduction.innerHTML = part_content.introduction;
		tut_part_header.appendChild(tut_part_introduction);

		tut_part.appendChild(tut_part_header);

		if (part_content.chapters) {
			if (typeof title_level === 'undefined') {
				title_level = 1;
			}
			title_level++;
			var list_chapters = document.createElement('ol');

			for (var i=0, nb=part_content.chapters.length; i<nb; i++) {
				var tut_chapter = app.writeTutorialSummaryChapter(tutorial, tutorial_content, part.chapters[i], part_content.chapters[i], title_level);
				list_chapters.appendChild(tut_chapter);
			}
			tut_part.appendChild(list_chapters);
		}

		var tut_part_conclusion = document.createElement('footer');
		tut_part_conclusion.className = 'tutorial-part-conclusion markdown-content';
		tut_part_conclusion.innerHTML = part_content.conclusion;
		tut_part.appendChild(tut_part_conclusion);

		return tut_part;
	},

	writeTutorialChapter: function (tutorial, tutorial_content, chapter, chapter_content, title_level) {
		var tut_chapter = document.createElement('article');
		tut_chapter.className = 'tutorial-chapter';

		var tut_chapter_introduction = document.createElement('header');
		tut_chapter_introduction.className = 'tutorial-chapter-introduction markdown-content';
		tut_chapter_introduction.innerHTML = chapter_content.introduction;
		tut_chapter.appendChild(tut_chapter_introduction);

		if (chapter_content.extracts) {
			if (typeof title_level === 'undefined') {
				title_level = 1;
			}
			title_level++;
			var list_extracts = document.createElement('ol');

			for (var i=0, nb=chapter_content.extracts.length; i<nb; i++) {
				var tut_extract = app.writeTutorialSummaryExtract(tutorial, tutorial_content, chapter.extracts[i], chapter_content.extracts[i], title_level);
				list_extracts.appendChild(tut_extract);
			}
			tut_chapter.appendChild(list_extracts);
		}

		var tut_chapter_conclusion = document.createElement('footer');
		tut_chapter_conclusion.className = 'tutorial-chapter-conclusion markdown-content';
		tut_chapter_conclusion.innerHTML = chapter_content.conclusion;
		tut_chapter.appendChild(tut_chapter_conclusion);

		return tut_chapter;
	},

	writeTutorialExtract: function (tutorial, tutorial_content, extract, extract_content) {
		var tut_extract = document.createElement('article');
		tut_extract.className = 'tutorial-extract';

		var tut_extract_title = document.createElement('header');
		tut_extract_title.className = 'tutorial-extract-title';
		tut_extract_title.textContent = extract_content.title;
		tut_extract.appendChild(tut_extract_title);

		var tut_extract_content = document.createElement('div');
		tut_extract_content.className = 'tutorial-extract-content markdown-content';
		tut_extract_content.innerHTML = extract_content.content;
		tut_extract.appendChild(tut_extract_content);

		return tut_extract;
	},

	loadTutorialFragment: function(tutorial, fragment, callback) {
		fs.readFile(app.path + 'data/tutorials/' + tutorial.id + '/' + fragment, { encoding: 'UTF-8', flag: 'r' },	 function(err, content) {
			if (err) {
				console.error(err);
				return;
			}

			callback(content);
		});
	}
}

app.init();
app.showHome();
// app.debug = true;
app.openDevTools();
app.window.setMinimumSize(320, 480);

