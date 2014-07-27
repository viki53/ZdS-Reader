// /(?:^|\n)\[\[information\]\](\n|$)/


(function(){

	var zds = function(converter) {
		return [
			{
				/* Touches de clavier */
				type: 'language',
				filter: function(text) {
					// return text.replace(/(?!\<code\>)(?=\<\/code\>)(?:[^\|]*)\|\|([^\|\|]+)\|\|(?:[^\|]*)(?!\<\code\>)/g, function(match, key) {
					return text.replace(/\|\|([^\|\|]+)\|\|/g, function(match, key) {
						return '<kbd>' + key + '</kbd>';
					});
				}
			},
			{
				/* Blocs spéciaux */
				type: 'language',
				filter: function (text) {
					return text.replace(/\[\[(i|information|q|question|e|erreur|a|attention|s|secret)\]\]\n(((?:\|)(.*)(?:\n))+)/g, function(match, type, content) {
						var types = {
							'i': 'information',
							'information': 'information',
							'question': 'question',
							'q': 'question',
							'erreur': 'error',
							'e': 'error',
							'attention': 'warning',
							'a': 'warning',
							'secret': 'secret',
							's': 'secret',
						}

						var content = content.split('\n').map(function(line){
							return line.replace(/^\|(.*)/, '$1');
						}).join('\n');

						return '<div class="' + types[type] + '">' + showdown_converter.makeHtml(content.trim()) + '</div>';
					})
				}
			}
		];
	};

	// Client-side export
	if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.zds = zds; }
	// Server-side export
	if (typeof module !== 'undefined') module.exports = zds;
}());