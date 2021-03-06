/* ---------------------------------------------------------------------------*/
/*	@module freestyle --------------------------------------------------------*/
/*	@author austinbillings ---------------------------------------------------*/
/*	@license: MIT ------------------------------------------------------------*/
/* ---------------------------------------------------------------------------*/

(function () {
	"use strict";

  var freestyle = {
    version: '0.0.4',
		generateTagId: function () {
			return '__freefall-injection-' + Date.now();
		},
    commentRegex: /(\/\/[^\r\n|^\n]+)|(\/\*[^\*\/]+\*\/)/g
  };
  
  /* Utils -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
  freestyle.error = function (err) {
    var message;
    switch (err.toLowerCase()) {
      case 'noscope':
      message = '#scopedCss called but no scope provided.';
      break;
      case 'invalid':
      message = 'Invalid Css Provided.';
      break;
      default:
      message = 'An unknown error occurred.';
    }
    message = '/* ----- [!] ' + message + ' ----- */';
    console.error(message);
    return wrap(message);
  };
  
  freestyle.explode = function (text, splitBy) {
    return text.split(splitBy)
    .map(function (items) { return items.trim(); })
    .filter(function (items) { return items.length; });
  };
  
  freestyle.camelToKebabCase = function (str) {
    if (typeof str !== 'string' || !str.length) return str;
    var pieces = str.split(/(?=[A-Z])/);
    return pieces
    .map(function (piece) { return piece.toLowerCase(); })
    .join('-');
  };
  
  freestyle.kebabToCamelCase = function (str) {
    if (typeof str !== 'string' || !str.length) return str;
    var pieces = str.split('-');
    return pieces
    .map(function (piece, i) { return i ? piece[0].toUpperCase() + piece.slice(1) : piece.toLowerCase(); })
    .join('');
  };
  
  freestyle.isValidCss = function (css) {
    var isString = typeof css === 'string' && css.length;
    var hasBrackets = css && css.indexOf('{') !== -1 && css.indexOf('}') !== -1;
    var bracketMatch = css && (css.match(/{/g) || []).length === (css.match(/}/g) || []).length;
    var commentMatch = css && (css.match(/\/\*/g) || []).length === (css.match(/\*\//g) || []).length;
    return (isString && hasBrackets && bracketMatch && commentMatch); 
  };
  
  /* CSS Transforms -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
  freestyle.stripCssComments = function (css) {
    return css.replace(freestyle.commentRegex, '');
  };
  
  freestyle.concatenateLines = function (css) {
    return freestyle.explode(css, '\n').join('');
  };
  
  freestyle.uglify = function (css) {
    return css
    .replace(/\n*/g, '')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}');
  };
  
  /* Format Conversions -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
  freestyle.cssToStyleList = function (css) {
    var styles = freestyle.explode(css, '}');
    
    var styleList = styles.map(function (ruleset) {
      var set = freestyle.explode(ruleset, '{');
      
      var selectors = freestyle.explode(set[0], ',');
      var rulesArray = freestyle.explode(set[1], ';');
      var rules = {};
      
      rulesArray.forEach(function (rule) {
        var parts = freestyle.explode(rule, ':');
        if (parts.length !== 2) return;
        var property = parts[0];
        var value = parts[1];
        rules[property] = value;
      });
      
      return { selectors: selectors, rules: rules };
    });
    
    return styleList;
  };
  
  
  freestyle.cssToPlainObject = function (css, multipleSelectorsPerKey) {
    var styleList = freestyle.cssToStyleList(css);
    return freestyle.styleListToPlainObject(styleList, multipleSelectorsPerKey);
  }

  freestyle.styleListToPlainObject = function (styleList, multipleSelectorsPerKey) {
    var plainObject = {};
    styleList.forEach(function (ruleset) {
      var selectors = ruleset.selectors;
      var rules = ruleset.rules;
      var _rules = {};
      for (var key in rules) {
        var newKey = freestyle.kebabToCamelCase(key);
        _rules[newKey] = rules[key];
      }
      rules = _rules;
      
      if (multipleSelectorsPerKey) {
        plainObject[selectors.join(', ')] = Object.assign({}, rules);
      } else {
        selectors.forEach(function (selector) {
          plainObject[selector] = Object.assign({}, rules);
        });
      }
    });
    return plainObject;
  };
  
  
  freestyle.styleListToCss = function (styleList) {
    var css = '';
    styleList.forEach(function (ruleset) {
      var selector = ruleset.selectors.join(', ');
      var ruleArray = [];
      for (var key in ruleset.rules) {
        ruleArray.push('  ' + key + ': ' + ruleset.rules[key]);
      }
      var rules = ruleArray.join('; \n');
      css += selector + ' {\n' + rules + '\n} \n\n';
    });
    return css;
  };
  
  freestyle.plainObjectToStyleList = function (plainObject) {
    var styleList = [];
    for (var key in plainObject) {
      var selectors = freestyle.explode(key, ',');
      var rules = {};
      for (var property in plainObject[key]) {
        var newProperty = freestyle.camelToKebabCase(property);
        rules[newProperty] = plainObject[key][property];
      }
      styleList.push({ selectors: selectors, rules: rules });
    }
    return styleList;
  };
  
  freestyle.plainObjectToCss = function (plainObject) {
    var styleList = freestyle.plainObjectToStyleList(plainObject);
    return freestyle.styleListToCss(styleList);
  };
  
  /* styleList Transforms -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
  freestyle.prefixStyleListSelectors = function (styleList, prefix) {
    if (!prefix || !prefix.length) return styleList;
    
    return styleList.map(function (ruleset) {
      ruleset.selectors = ruleset.selectors.map(function (selector) { return prefix + ' ' + selector; });
      return ruleset;
    });
  };
  
  /* Features -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
  freestyle.scopedCss = function (css, scope, ugly) {
    if (!scope) return freestyle.error('noscope');
    if (!freestyle.isValidCss(css)) return freestyle.error('invalid');
    css = freestyle.stripCssComments(css);
    css = freestyle.concatenateLines(css);
    
    var styleList;
    styleList = freestyle.cssToStyleList(css);
    styleList = freestyle.prefixStyleListSelectors(styleList, scope);
    
    css = freestyle.styleListToCss(styleList);
    if (ugly) css = freestyle.uglify(css);
    return css;
  };
	
	freestyle.injectCss = function (css, id, appendTo) {
		id = id || freestyle.generateTagId();
		appendTo = appendTo || document.getElementsByTagName('head')[0];
		
		if (!freestyle.isValidCss(css)) return freestyle.error('invalid');
		
		var test = document.getElementById(id);
		
		if (!test || test.tagName.toLowerCase() !== 'style') {
			var element = document.createElement('style');
			element.setAttribute('type', 'text/css');
			element.setAttribute('id', id);
			appendTo.appendChild(element);
		};
		
		var node = document.getElementById(id);
		node.innerHTML = css;
		return node;
	}
	
	freestyle.removeInjection = function (id) {
		var presume = document.getElementById(id);
		if (presume && presume.tagName.toLowerCase() === 'style') {
			presume.remove();
			return true;
		}
		return false;
	}
  
  /* Export -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = freestyle;
	} else {
		window.freestyle = freestyle;
	}
})();