// /(?:^|\n)\[\[information\]\](\n|$)/


(function(){

	var zds = function(converter) {
		return [
			// {
			// 	type: 'output',
			// 	regex: ' \|\|([^|]+)\|\| ',
			// 	replace: function(key) {
			// 		// console.dir(arguments);
			// 		return '<kbd>' + key + '</kbd>';
			// 		// return '<span class="keyboard">' + key + '</span>';
			// 	}
			// },
			// {
			// 	type: 'output',
			// 	// regex: '(?:^|\n)\[\[information\]\](\n|$)',
			// 	// regex: '(?:^|\n\r?)\[\[(information|question|erreur|attention)\]\]\n\r?(?:\| (.*)\n\r?)',
			// 	regex: '\[\[(information|question|erreur|attention)\]\]\n(?:\| (.*)\n)',
			// 	replace: function(type, content) {
			// 		console.dir(arguments);
			// 		return '<div class="' + type + '">' + converter.makeHtml(content) + '</div>';
			// 	}
			// }
		];
	};

	// Client-side export
	if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.zds = zds; }
	// Server-side export
	if (typeof module !== 'undefined') module.exports = zds;
}());