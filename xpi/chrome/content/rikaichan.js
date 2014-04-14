﻿/*

	Rikaichan
	Copyright (C) 2005-2014 Jonathan Zarate
	http://www.polarcloud.com/

	---

	Originally based on RikaiXUL 0.4 by Todd Rudick
	http://www.rikai.com/
	http://rikaixul.mozdev.org/

	---

	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

	---

	Please do not change or remove any of the copyrights or links to web pages
	when modifying any of the files.

*/

var rcxMain = {
	altView: 0,
	enabled: 0,
	sticky: false,
	version: null,

	getBrowserTB: function() {
		if (rcxMain.tabMail) return rcxMain.tabMail.getBrowserForSelectedTab();
		return document.getElementById('messagepane') || document.getElementById('content-frame');
	},

	getBrowserFF: function() {
		return gBrowser.mCurrentBrowser;
	},

	global: function() {
		return Components.classes["@mozilla.org/appshell/appShellService;1"]
			.getService(Components.interfaces.nsIAppShellService)
			.hiddenDOMWindow;
	},

	rcxObs: {
		observe: function(subject, topic, data) {
//			rcxDebug.echo('rcxObs: topic=' + topic + ' / data=' + data);

			if (topic == 'rikaichan') {
				if (data == 'getdic') {
					rcxMain.showDownloadPage();
					return;
				}

				if (data == 'dready') {
					if (rcxMain.tabSelectPending) {
						rcxMain.tabSelectPending = false;
						rcxMain.onTabSelect();
					}
					return;
				}

				// enmode: 0=tab, 1=browser, 2=all, 3=always
				if ((rcxConfig.enmode >= 2) && ((data == 'enable') || (data == 'disable'))) {
					if (rcxMain.enabled != (data == 'enable')) {
						if (rcxMain.enabled) rcxMain.disable(gBrowser.mCurrentBrowser, 0);
							else rcxMain.enabled = 1;
						rcxMain.onTabSelect();
					}
				}
			}
		},
		register: function() {
			Components.classes["@mozilla.org/observer-service;1"]
				.getService(Components.interfaces.nsIObserverService)
				.addObserver(rcxMain.rcxObs, 'rikaichan', false);
		},
		unregister: function() {
			Components.classes['@mozilla.org/observer-service;1']
				.getService(Components.interfaces.nsIObserverService)
				.removeObserver(rcxMain.rcxObs, 'rikaichan');
		},
		notifyState: function(state) {
			Components.classes['@mozilla.org/observer-service;1']
				.getService(Components.interfaces.nsIObserverService)
				.notifyObservers(null, 'rikaichan', state);
		}
	},

	tbObs: {
		observe: function(subject, topic, data) {
			if (topic == 'mail:composeOnSend') {
				var e = window.content.document.getElementById('rikaichan-css');
				if (e) e.parentNode.removeChild(e);
				e = window.content.document.getElementById('rikaichan-window');
				if (e) e.parentNode.removeChild(e);
			}
		},
		register: function() {
			Components.classes['@mozilla.org/observer-service;1']
				.getService(Components.interfaces.nsIObserverService)
				.addObserver(rcxMain.tbObs, 'mail:composeOnSend', false);
		},
		unregister: function() {
			Components.classes['@mozilla.org/observer-service;1']
				.getService(Components.interfaces.nsIObserverService)
				.removeObserver(rcxMain.tbObs, 'mail:composeOnSend');
		}
	},

	tbTabMonitor: {
		monitorName: 'rikaichan',
		onTabSwitched: function(aTab, aOldTab) { rcxMain.onTabSelect() },
		onTabTitleChanged: function(aTab) { },
		onTabOpened: function(aTab, aIsFirstTab, aWasCurrentTab) { },
		onTabClosing: function(aTab) { },
		onTabPersist: function(aTab) { },
		onTabRestored: function(aTab, aState, aIsFirstTab) { }
	},

	init: function() {
		window.addEventListener('load', function() { rcxMain._init() }, false);
	},

	_init: function() {
		window.addEventListener('unload', function() { rcxMain.onUnload() }, false);

		if (true) {
			let docID = document.documentElement.id;
			this.isTB = ((docID == "messengerWindow") || (docID == "msgcomposeWindow"));

			let mks = this.isTB ? (document.getElementById('mailKeys') || document.getElementById('editorKeys')) :
						document.getElementById('mainKeyset') || document.getElementById('navKeys');
			if (mks) {
				let prefs = new rcxPrefs();
				for (let [i, name] in ['toggle', 'lbar']) {
					let s = prefs.getString(name + '.key');
					if ((s.length) && (s != '(disabled)')) {
						let key = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'key');
						key.setAttribute('id', 'rikaichan-key-' + name);
						if (s.length > 1) key.setAttribute('keycode', 'VK_' + s.replace(' ', '_').toUpperCase());	// "Page Up" -> "VK_PAGE_UP"
							else key.setAttribute('key', s);
						key.setAttribute('modifiers', prefs.getString(name + '.mod'));
						key.setAttribute('command', 'rikaichan-' + name + '-cmd');
						mks.appendChild(key);
					}
				}
			}
		}

		this.rcxObs.register();

		rcxConfig.load();
		rcxConfig.observer.start();

		if (this.isTB) {
			this.getBrowser = function() {
				if (rcxMain.tabMail) return rcxMain.tabMail.getBrowserForSelectedTab();
				return document.getElementById('messagepane') || document.getElementById('content-frame');
			}

			this.tabMail = document.getElementById('tabmail');
			if (this.tabMail) {
				this.tabMail.registerTabMonitor(this.tbTabMonitor);
			}

			this.tbObs.register();
		}
		else {
			this.getBrowser = function() { return gBrowser.mCurrentBrowser; }

			gBrowser.mTabContainer.addEventListener('select', this.onTabSelect, false);

			// enmode: 0=tab, 1=browser, 2=all, 3=always
			if (rcxConfig.enmode >= 2) {
				if ((rcxConfig.enmode == 3) || (this.global().rikaichanActive)) {
					this.enabled = 1;
					this.onTabSelect();
				}
			}

			// add icon to the toolbar
			try {
				let prefs = new rcxPrefs();
				if (prefs.getBool('firsticon')) {
					prefs.setBool('firsticon', false);

					// ref: https://developer.mozilla.org/En/Code_snippets:Toolbar#Adding_button_by_default
					let nb = document.getElementById('nav-bar');
					nb.insertItem('rikaichan-toggle-button');
					nb.setAttribute('currentset', nb.currentSet);
					document.persist(nb.id, 'currentset');
				}
			}
			catch (ex) { }
		}

		this.checkVersion();
	},

	onUnload: function() {
		this.rcxObs.unregister();
		rcxConfig.observer.stop();
		if (this.isTB) {
			if (this.tabMail) {
				this.tabMail.unregisterTabMonitor(this.tbTabMonitor);
			}
			this.tbObs.unregister();
		}
		else {
			gBrowser.mTabContainer.removeEventListener('select', this.onTabSelect, false);
		}
	},

	initDictionary: function() {
		if (rcxData.missing) {
			if (confirm('No dictionary file was found. Show the download page?')) {
				this.showDownloadPage();
			}
			return false;
		}
		try {
			rcxData.init();
		}
		catch (ex) {
			alert('Error: ' + ex);
			return false;
		}
		return true;
	},

	showDownloadPage: function() {
		const url = 'http://www.polarcloud.com/getrcx/?version=' + (this.version || '');
		try {
			if (this.isTB) {
				Components.classes['@mozilla.org/messenger;1'].createInstance()
					.QueryInterface(Components.interfaces.nsIMessenger)
					.launchExternalURL(url);
			}
			else {
				gBrowser.selectedTab = gBrowser.addTab(url);
			}
		}
		catch (ex) {
			alert('There was an error opening ' + url);
		}
	},

	checkVersion: function() {
		let id = '{0AA9101C-D3C1-4129-A9B7-D778C6A17F82}';
		try {
			// ref: https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonManager
			Components.utils.import('resource://gre/modules/AddonManager.jsm');
			AddonManager.getAddonByID(id, function(addon) {
				rcxMain.version = addon.version;
			});
		}
		catch (ex) {
			try {
				this.version = Components.classes['@mozilla.org/extensions/manager;1']
					.getService(Components.interfaces.nsIExtensionManager)
					.getItemForID(id).version;
			}
			catch (ex) {
			}
		}

		if (rcxConfig.checkversion) {
			setTimeout(function() {
				if (rcxMain.version) {
					let prefs = new rcxPrefs();
					let v = 'v' + rcxMain.version;
					if (prefs.getString('version') != v) {
						prefs.setString('version', v);
						rcxMain.showDownloadPage();
					}
				}
			}, 2000);
		}
	},

	onTabSelect: function() {
		// see rcxData.loadConfig
		if ((rcxData.dicPath) && (!rcxData.dicPath.ready)) {
			rcxMain.tabSelectPending = true;
		}
		else {
			rcxMain._onTabSelect();
		}
	},

	_onTabSelect: function() {
		var bro = this.getBrowser();

		if (this.isTB) {
			if (this.enabled) this.enable(bro, 0);
				else this.disable(bro);
		}
		else if ((rcxConfig.enmode > 0) && (this.enabled == 1) && (bro.rikaichan == null)) {
			this.enable(bro, 0);
		}

		var en = (bro.rikaichan != null);

		var b = document.getElementById('rikaichan-toggle-cmd');
		if (b) {
			// FF 14/15/+? weirdness:
			//	attr false:   toolbar icon remains sunk (bad) / context/tools menu is unchecked (ok)
			//	attr removed: toolbar icon is normal (ok) / context/tools menu remains checked (bad)
			
			b.setAttribute('checked', en);
			
			if (!en) {
				b = document.getElementById('rikaichan-toggle-button');
				if (b) b.removeAttribute('checked');
				b = document.getElementById('rikaichan-toggle-button-gs');
				if (b) b.removeAttribute('checked');
			}
		}

		b = document.getElementById('rikaichan-status');
		if (b) b.setAttribute('rcx_enabled', en);
	},

	showPopup: function(text, elem, pos, lbPop) {
		// outer-most document
		var content = this.isTB ? this.getBrowser().contentWindow : window.content;
		var topdoc = content.document;

		var x = 0, y = 0;
		if (pos) {
			x = pos.screenX;
			y = pos.screenY;
		}

		this.lbPop = lbPop;

		var popup = topdoc.getElementById('rikaichan-window');
		if (!popup) {
			var css = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'link');
			css.setAttribute('rel', 'stylesheet');
			css.setAttribute('type', 'text/css');
			css.setAttribute('href', rcxConfig.css);
			css.setAttribute('id', 'rikaichan-css');
			topdoc.getElementsByTagName('head')[0].appendChild(css);

			popup = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
			popup.setAttribute('id', 'rikaichan-window');
			topdoc.documentElement.appendChild(popup);

			// if this is not set then Cyrillic text is displayed with Japanese
			// font, if the web page uses a Japanese code page as opposed to Unicode.
			// This makes it unreadable.
			popup.setAttribute('lang', 'en');

			popup.addEventListener('dblclick',
				function (ev) {
					rcxMain.hidePopup();
					ev.stopPropagation();
				}, true);

			if (rcxConfig.resizedoc) {
				if ((topdoc.body.clientHeight < 1024) && (topdoc.body.style.minHeight == '')) {
					topdoc.body.style.minHeight = '1024px';
					topdoc.body.style.overflow = 'auto';
				}
			}
		}

		popup.style.maxWidth = (lbPop ? '' : '600px');

		if (topdoc.contentType == 'text/plain') {
			var df = document.createDocumentFragment();
			var sp = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
			df.appendChild(sp);
			sp.innerHTML = text;
			while (popup.firstChild) {
				popup.removeChild(popup.firstChild);
			}
			popup.appendChild(df);
		}
		else {
			popup.innerHTML = text;
		}

		if (elem) {
			popup.style.top = '-1000px';
			popup.style.left = '0px';
			popup.style.display = '';

			var width = popup.offsetWidth;
			var height = popup.offsetHeight;

			// guess! (??? still need this?)
			if (width <= 0) width = 200;
			if (height <= 0) {
				height = 0;
				var j = 0;
				while ((j = text.indexOf('<br', j)) != -1) {
					j += 5;
					height += 22;
				}
				height += 25;
			}

			if (this.altView == 1) {
				// upper-left
				x = 0;
				y = 0;
			}
			else if (this.altView == 2) {
				// lower-right
				x = (content.innerWidth - (width + 20));
				y = (content.innerHeight - (height + 20));
			}
			else {
				// convert xy relative to outer-most document
				var cb = this.getBrowser();
				var bo = cb.boxObject;
				x -= bo.screenX;
				y -= bo.screenY;

				// when zoomed, convert to zoomed document pixel position
				// - not in TB compose and ...?
				if (cb.markupDocumentViewer != null) {
					var z = cb.markupDocumentViewer.fullZoom || 1;
					if (z != 1) {
						x = Math.round(x / z);
						y = Math.round(y / z);
					}
				}

				if (elem instanceof Components.interfaces.nsIDOMHTMLOptionElement) {
					// these things are always on z-top, so go sideways
					x -= pos.pageX;
					y -= pos.pageY;
					var p = elem;
					while (p) {
						x += p.offsetLeft;
						y += p.offsetTop;
						p = p.offsetParent;
					}

					// right side of box
					var w = elem.parentNode.offsetWidth + 5;
					x += w;

					if ((x + width) > content.innerWidth) {
						// too much to the right, go left
						x -= (w + width + 5);
						if (x < 0) x = 0;
					}

					if ((y + height) > content.innerHeight) {
						y = content.innerHeight - height - 5;
						if (y < 0) y = 0;
					}
				}
				else {
					// go left if necessary
					if ((x + width) > (content.innerWidth - 20)) {
						x = (content.innerWidth - width) - 20;
						if (x < 0) x = 0;
					}

					// below the mouse
					var v = 25;

					// under the popup title
					if ((elem.title) && (elem.title != '')) v += 20;

					// go up if necessary
					if ((y + v + height) > content.innerHeight) {
						var t = y - height - 30;
						if (t >= 0) y = t;
					}
					else y += v;
				}
			}
		}

		popup.style.left = (x + content.scrollX) + 'px';
		popup.style.top = (y + content.scrollY) + 'px';
		popup.style.display = '';
	},

	hidePopup: function() {
		var doc = this.isTB ? new XPCNativeWrapper(this.getBrowser().contentDocument) : window.content.document;
		var popup = doc.getElementById('rikaichan-window');
		if (popup) {
			popup.style.display = 'none';
			popup.innerHTML = '';
		}
		this.lbPop = 0;
		this.title = null;
	},

	isVisible: function() {
		var doc = this.isTB ? this.getBrowser().contentDocument : window.content.document;
		var popup = doc.getElementById('rikaichan-window');
		return (popup) && (popup.style.display != 'none');
	},

	clearHi: function() {
		var tdata = this.getBrowser().rikaichan;
		if ((!tdata) || (!tdata.prevSelView)) return;
		if (tdata.prevSelView.closed) {
			tdata.prevSelView = null;
			return;
		}

		var sel = tdata.prevSelView.getSelection();
		if ((sel.isCollapsed) || (tdata.selText == sel.toString())) {
			sel.removeAllRanges();
		}
		tdata.prevSelView = null;
		tdata.kanjiChar = null;
		tdata.selText = null;
	},

	//

	lastFound: null,

	savePrep: function(clip) {
		var me, mk;
		var text;
		var i;
		var f;
		var e;

		f = this.lastFound;
		if ((!f) || (f.length == 0)) return null;

		if (clip) {
			me = rcxConfig.smaxce;
			mk = rcxConfig.smaxck;
		}
		else {
			me = rcxConfig.smaxfe;
			mk = rcxConfig.smaxfk;
		}

		if (!f.fromLB) mk = 1;

		text = '';
		for (i = 0; i < f.length; ++i) {
			e = f[i];
			if (e.kanji) {
				if (mk-- <= 0) continue
				text += rcxData.makeText(e, 1);
			}
			else {
				if (me <= 0) continue;
				text += rcxData.makeText(e, me);
				me -= e.data.length;
			}
		}

		if (rcxConfig.snlf == 1) text = text.replace(/\n/g, '\r\n');
			else if (rcxConfig.snlf == 2) text = text.replace(/\n/g, '\r');

		var sep = rcxConfig.ssep;
		switch (sep) {
		case 'Tab':
			sep = '\t';
			break;
		case 'Comma':
			sep = ',';
			break;
		case 'Space':
			sep = ' ';
			break;
		}
		if (sep != '\t') return text.replace(/\t/g, sep);

		return text;
	},

	copyToClip: function() {
		var text;

		if ((text = this.savePrep(1)) != null) {
			Components.classes['@mozilla.org/widget/clipboardhelper;1']
				.getService(Components.interfaces.nsIClipboardHelper)
				.copyString(text);
			this.showPopup('Copied to clipboard.');
		}
	},

	saveToFile: function() {
		var text;
		var i;
		var lf, fos, os;

		try {
			if ((text = this.savePrep(0)) == null) return;

			if (rcxConfig.sfile.length == 0) {
				this.showPopup('Please set the filename in Preferences.');
				return;
			}

			lf = Components.classes['@mozilla.org/file/local;1']
					.createInstance(Components.interfaces.nsILocalFile);
			lf.initWithPath(rcxConfig.sfile);
			let exists = lf.exists();
			
			fos = Components.classes['@mozilla.org/network/file-output-stream;1']
				.createInstance(Components.interfaces.nsIFileOutputStream);
			fos.init(lf, 0x02 | 0x08 | 0x10, -1, 0);
			
			if ((!exists) && (rcxConfig.ubom) && (rcxConfig.sfcs == 'utf-8')) {
				let bom = '\xEF\xBB\xBF';
				fos.write(bom, bom.length);
			}

			// note: nsIConverterOutputStream always adds BOM for UTF-16

			os = Components.classes['@mozilla.org/intl/converter-output-stream;1']
					.createInstance(Components.interfaces.nsIConverterOutputStream);
			os.init(fos, rcxConfig.sfcs, 0, 0x3F);	// unknown -> '?'
			os.writeString(text);
			os.close();

			fos.close();

			this.showPopup('Saved.');
		}
		catch (ex) {
			this.showPopup('Error while saving: ' + ex);
		}
	},

	configPage: function() {
		window.openDialog('chrome://rikaichan/content/options.xul', '', 'chrome,centerscreen');
	},

	//

	keysDown: [],

	onKeyDown: function(ev) { rcxMain._onKeyDown(ev) },
	_onKeyDown: function(ev) {
		//	this.status('keyCode=' + ev.keyCode + ' charCode=' + ev.charCode + ' detail=' + ev.detail);

		if ((ev.altKey) || (ev.metaKey) || (ev.ctrlKey)) return;
		if ((ev.shiftKey) && (ev.keyCode != 16)) return;
		if (this.keysDown[ev.keyCode]) return;
		if (!this.isVisible()) return;
		if ((rcxConfig.nopopkeys) && (ev.keyCode != 16)) return;

		var i;

		switch (ev.keyCode) {
		case 13:	// enter
			this.clearHi();
			// continues...
		case 16:	// shift
			let tdata = ev.currentTarget.rikaichan;
			if (tdata) {
				rcxData.selectNext();	// @@@ hmm
				if (tdata.titleShown) this.showTitle(tdata);
					else this.show(tdata);
			}
			break;
		case 27:	// esc
			this.hidePopup();
			this.clearHi();
			break;
		case 65:	// a
			this.altView = (this.altView + 1) % 3;
			if (this.altView) this.status('Alternate View #' + this.altView);
				else this.status('Normal View');
			this.show(ev.currentTarget.rikaichan);
			break;
		case 67:	// c
			this.copyToClip();
			break;
		case 68:	// d
			rcxConfig.hidedef = !rcxConfig.hidedef;
			this.status((rcxConfig.hidedef ? 'Hide' : 'Show') + ' definition');
			if (rcxConfig.hidedef) this.showPopup('Hiding definitions. Press "D" to show again.');
				else this.show(ev.currentTarget.rikaichan);
			break;
		case 83:	// s
			this.saveToFile();
			break;
		case 66:	// b
			var ofs = ev.currentTarget.rikaichan.uofs;
			for (i = 50; i > 0; --i) {
				ev.currentTarget.rikaichan.uofs = --ofs;
				rcxData.select(0);
				if (this.show(ev.currentTarget.rikaichan) >= 0) {
					if (ofs >= ev.currentTarget.rikaichan.uofs) break;	// ! change later
				}
			}
			break;
		case 77:	// m
			ev.currentTarget.rikaichan.uofsNext = 1;
		case 78:	// n
			for (i = 50; i > 0; --i) {
				ev.currentTarget.rikaichan.uofs += ev.currentTarget.rikaichan.uofsNext;
				rcxData.select(0);
				if (this.show(ev.currentTarget.rikaichan) >= 0) break;
			}
			break;
		case 75:	// k
			this.sticky = !this.sticky;
			this.status(this.sticky ? 'Sticky Popup' : 'Normal Popup');
			break;
		case 89:	// y
			this.altView = 0;
			ev.currentTarget.rikaichan.popY += 20;
			this.show(ev.currentTarget.rikaichan);
			break;
		default:
			if ((ev.keyCode >= 49) && (ev.keyCode <= 57)) {	// 1-9
				rcxData.select(ev.keyCode - 49);
				this.show(ev.currentTarget.rikaichan);
			}
			return;
		}

		this.keysDown[ev.keyCode] = 1;

		// don't eat shift if in this mode
		if (!rcxConfig.nopopkeys) {
			ev.stopPropagation();
			ev.preventDefault();
		}
	},

	onKeyUp: function(ev) {
		if (rcxMain.keysDown[ev.keyCode]) rcxMain.keysDown[ev.keyCode] = 0;
	},


	onMouseDown: function(ev) {
		if (!rcxMain.cursorInPopup(ev)) rcxMain.hidePopup();
	},

	unicodeInfo: function(c) {
		const hex = '0123456789ABCDEF';
		const u = c.charCodeAt(0);
		return c + ' U' + hex[(u >>> 12) & 15] + hex[(u >>> 8) & 15] + hex[(u >>> 4) & 15] + hex[u & 15];
	},

	inlineNames: {
		// text node
		'#text': true,

		// font style
		'FONT': true,
		'TT': true,
		'I' : true,
		'B' : true,
		'BIG' : true,
		'SMALL' : true,
		//deprecated
		'STRIKE': true,
		'S': true,
		'U': true,

		// phrase
		'EM': true,
		'STRONG': true,
		'DFN': true,
		'CODE': true,
		'SAMP': true,
		'KBD': true,
		'VAR': true,
		'CITE': true,
		'ABBR': true,
		'ACRONYM': true,

		// special, not included IMG, OBJECT, BR, SCRIPT, MAP, BDO
		'A': true,
		'Q': true,
		'SUB': true,
		'SUP': true,
		'SPAN': true,
		'WBR': true,

		// ruby
		'RUBY': true,
		'RBC': true,
		'RTC': true,
		'RB': true,
		'RT': true,
		'RP': true
	},

	// Gets text from a node and returns it
	// node: a node
	// selEnd: the selection end object will be changed as a side effect
	// maxLength: the maximum length of returned string
	getInlineText: function (node, selEndList, maxLength) {
		if ((node.nodeType == Node.TEXT_NODE) && (node.data.length == 0)) return ''

		let text = '';
		let result = node.ownerDocument.evaluate('descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]',
						node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		while ((maxLength > 0) && (node = result.iterateNext())) {
			text += node.data.substr(0, maxLength);
			maxLength -= node.data.length;
			selEndList.push(node);
		}
		return text;
	},

	// Given a node which must not be null, returns either the next sibling or
	// the next sibling of the father or the next sibling of the fathers father
	// and so on or null
	getNext: function(node) {
		do {
			if (node.nextSibling) return node.nextSibling;
			node = node.parentNode;
		} while ((node) && (this.inlineNames[node.nodeName]));
		return null;
	},

	getTextFromRange: function(rangeParent, offset, selEndList, maxLength) {
		if (rangeParent.ownerDocument.evaluate('boolean(parent::rp or ancestor::rt)',
			rangeParent, null, XPathResult.BOOLEAN_TYPE, null).booleanValue)
			return '';

		if (rangeParent.nodeType != Node.TEXT_NODE)
			return '';

		let text = rangeParent.data.substr(offset, maxLength);
		selEndList.push(rangeParent);

		var nextNode = rangeParent;
		while ((text.length < maxLength) &&
			((nextNode = this.getNext(nextNode)) != null) &&
			(this.inlineNames[nextNode.nodeName])) {
			text += this.getInlineText(nextNode, selEndList, maxLength - text.length);
		}

		return text;
	},

	highlightMatch: function(doc, rp, ro, matchLen, selEndList, tdata) {
		if (selEndList.length === 0) return;

		var selEnd;
		var offset = matchLen + ro;
		// before the loop
		// |----!------------------------!!-------|
		// |(------)(---)(------)(---)(----------)|
		// offset: '!!' lies in the fifth node
		// rangeOffset: '!' lies in the first node
		// both are relative to the first node
		// after the loop
		// |---!!-------|
		// |(----------)|
		// we have found the node in which the offset lies and the offset
		// is now relative to this node
		for (var i = 0; i < selEndList.length; ++i) {
			selEnd = selEndList[i]
			if (offset <= selEnd.data.length) break;
			offset -= selEnd.data.length;
		}

		var range = doc.createRange();
		range.setStart(rp, ro);
		range.setEnd(selEnd, offset);

		var sel = doc.defaultView.getSelection();
		if ((!sel.isCollapsed) && (tdata.selText != sel.toString()))
			return;
		sel.removeAllRanges();
		sel.addRange(range);
		tdata.selText = sel.toString();
	},

	show: function(tdata) {
		var rp = tdata.prevRangeNode;
		var ro = tdata.prevRangeOfs + tdata.uofs;

		tdata.uofsNext = 1;

		if (!rp) {
			this.clearHi();
			this.hidePopup();
			return 0;
		}

		if ((ro < 0) || (ro >= rp.data.length)) {
			this.clearHi();
			this.hidePopup();
			return 0;
		}

		// @@@ check me
		let u = rp.data.charCodeAt(ro);
		if ((isNaN(u)) ||
			((u != 0x25CB) &&
			((u < 0x3001) || (u > 0x30FF)) &&
			((u < 0x3400) || (u > 0x9FFF)) &&
			((u < 0xF900) || (u > 0xFAFF)) &&
			((u < 0xFF10) || (u > 0xFF9D)))) {
			this.clearHi();
			this.hidePopup();
			return -2;
		}

		//selection end data
		var selEndList = [];
		var text = this.getTextFromRange(rp, ro, selEndList, 13);
		if (text.length == 0) {
			this.clearHi();
			this.hidePopup();
			return 0;
		}

		var e = rcxData.wordSearch(text);
		if (e == null) {
			this.hidePopup();
			this.clearHi();
			return 0;
		}
		this.lastFound = [e];

		if (!e.matchLen) e.matchLen = 1;
		tdata.uofsNext = e.matchLen;
		tdata.uofs = (ro - tdata.prevRangeOfs);

		// don't try to highlight form elements
		if ((rcxConfig.highlight) && (!('form' in tdata.prevTarget))) {
			var doc = tdata.prevRangeNode.ownerDocument;
			if (!doc) {
				this.clearHi();
				this.hidePopup();
				return 0;
			}
			this.highlightMatch(doc, tdata.prevRangeNode, ro, e.matchLen, selEndList, tdata);
			tdata.prevSelView = doc.defaultView;
		}

		tdata.titleShown = false;
		this.showPopup(rcxData.makeHtml(e), tdata.prevTarget, tdata.pos);
		return 1;
	},

	showTitle: function(tdata) {
		var e = rcxData.translate(tdata.title);
		if (!e) {
			this.hidePopup();
			return;
		}

		e.title = tdata.title.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) { return '&#' + c.charCodeAt(0) + ';' } );
		if (tdata.title.length > e.textLen) e.title += '...';

		this.lastFound = [e];
		tdata.titleShown = true;
		this.showPopup(rcxData.makeHtml(e), tdata.prevTarget, tdata.pos);
	},

	onMouseMove: function(ev) { rcxMain._onMouseMove(ev); },
	_onMouseMove: function(ev) {
		var tdata = ev.currentTarget.rikaichan;	// per-tab data
		var rp = ev.rangeParent;
		var ro = ev.rangeOffset;

/*
		var cb = this.getBrowser();
		var bbo = cb.boxObject;
		var z = cb.markupDocumentViewer ? cb.markupDocumentViewer.fullZoom : 1;
		var y = (ev.screenY - bbo.screenY);
		this.status('sy=' + ev.screenY + ' z=' + z +
			' bsy=' + bbo.screenY + ' y=' + y + ' y/z=' + Math.round(y / z));
*/

		if ((this.sticky) && (this.cursorInPopup(ev))) {
			clearTimeout(tdata.timer);
			tdata.timer = null;
			return;
		}

		if (ev.target == tdata.prevTarget) {
			if (tdata.title) return;
			if ((rp == tdata.prevRangeNode) && (ro == tdata.prevRangeOfs)) return;
		}

		if (tdata.timer) {
			clearTimeout(tdata.timer);
			tdata.timer = null;
		}

		if ((ev.explicitOriginalTarget.nodeType != Node.TEXT_NODE) && !('form' in ev.target)) {
			rp = null;
			ro = -1;
		}

		tdata.prevTarget = ev.target;
		tdata.prevRangeNode = rp;
		tdata.prevRangeOfs = ro;
		tdata.title = null;
		tdata.uofs = 0;
		this.uofsNext = 1;

		if (ev.button != 0) return;
		if (this.lbPop) return;

		if ((rp) && (rp.data) && (ro < rp.data.length)) {
			rcxData.select(ev.shiftKey ? rcxData.kanjiPos : 0);
			//	tdata.pos = ev;
			tdata.pos = { screenX: ev.screenX, screenY: ev.screenY, pageX: ev.pageX, pageY: ev.pageY };
			tdata.timer = setTimeout(function() { rcxMain.show(tdata) }, rcxConfig.popdelay);
			return;
		}

		if (rcxConfig.title) {
			if ((typeof(ev.target.title) == 'string') && (ev.target.title.length)) {
				tdata.title = ev.target.title;
			}
			else if ((typeof(ev.target.alt) == 'string') && (ev.target.alt.length)) {
				tdata.title = ev.target.alt;
			}
		}

		if (ev.target.nodeName == 'OPTION') {
			tdata.title = ev.target.text;
		}
		else if (ev.target.nodeName == 'SELECT') {
			tdata.title = ev.target.options[ev.target.selectedIndex].text;
		}

		if (tdata.title) {
			//	tdata.pos = ev;
			tdata.pos = { screenX: ev.screenX, screenY: ev.screenY, pageX: ev.pageX, pageY: ev.pageY };
			tdata.timer = setTimeout(function() { rcxMain.showTitle(tdata) }, rcxConfig.popdelay);
			return;
		}

		if ((tdata.pos) && (!this.sticky)) {
			// dont close just because we moved from a valid popup slightly over to a place with nothing
			var dx = tdata.pos.screenX - ev.screenX;
			var dy = tdata.pos.screenY - ev.screenY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > 4) {
				this.clearHi();
				this.hidePopup();
			}
		}
	},

	cursorInPopup: function(pos) {
		var doc = this.isTB ? this.getBrowser().contentDocument : window.content.document;
		var popup = doc.getElementById('rikaichan-window');
		return (popup && (popup.style.display !== 'none') &&
			(pos.pageX >= popup.offsetLeft) &&
			(pos.pageX <= popup.offsetLeft + popup.offsetWidth) &&
			(pos.pageY >= popup.offsetTop) &&
			(pos.pageY <= popup.offsetTop + popup.offsetHeight));
	},

	_enable: function(b) {
		if ((b != null) && (b.rikaichan == null)) {
			//	alert('enable ' + b.id);
			b.rikaichan = {};
			b.addEventListener('mousemove', this.onMouseMove, false);
			b.addEventListener('mousedown', this.onMouseDown, false);
			b.addEventListener('keydown', this.onKeyDown, true);
			b.addEventListener('keyup', this.onKeyUp, true);
			return true;
		}
		return false;
	},

	enable: function(b, mode) {
		if (!this.initDictionary()) return;
		var ok = this._enable(b, mode);

		if (this.isTB) {
			this._enable(document.getElementById('multimessage'));
			this._enable(document.getElementById('messagepane'));
		}

		if (ok) {
			if (mode == 1) {
				if (rcxConfig.enmode > 0) {
					this.enabled = 1;
					if (rcxConfig.enmode == 2) {
						this.global().rikaichanActive = true;
						this.rcxObs.notifyState('enable');
					}
				}

				if (rcxConfig.minihelp) this.showPopup(rcxFile.read('chrome://rikaichan/locale/minihelp.htm'));
					else this.showPopup('Rikaichan Enabled');
			}
		}
	},

	_disable: function(b) {
		if (b != null) {
			//	alert('disable ' + b.id);
			b.removeEventListener('mousemove', this.onMouseMove, false);
			b.removeEventListener('mousedown', this.onMouseDown, false);
			b.removeEventListener('keydown', this.onKeyDown, true);
			b.removeEventListener('keyup', this.onKeyUp, true);

			var e = b.contentDocument.getElementById('rikaichan-css');
			if (e) e.parentNode.removeChild(e);

			e = b.contentDocument.getElementById('rikaichan-window');
			if (e) e.parentNode.removeChild(e);

			delete b.rikaichan;
			return true;
		}
		return false;
	},

	disable: function(b, mode) {
		this._disable(b);
		if (this.isTB) {
			this.enabled = 0;
			this._disable(document.getElementById('multimessage'));
			this._disable(document.getElementById('messagepane'));
		}
		else if (this.enabled) {
			this.enabled = 0;

			for (var i = 0; i < gBrowser.browsers.length; ++i) {
				this._disable(gBrowser.browsers[i], 0);
			}

			if ((rcxConfig.enmode == 2) && (mode == 1)) {
				this.global().rikaichanActive = false;
				this.rcxObs.notifyState('disable');
			}
		}

		rcxData.done();
	},

	toggle: function() {
		var b = this.getBrowser();
		if (b.rikaichan) this.disable(b, 1);
			else this.enable(b, 1);
		this.onTabSelect();
	},

	getSelected: function(win) {
		var text;
		var s = win.getSelection()
		if (s) {
			text = s.toString();
			if (text.search(/[^\s]/) != -1) return text;
		}
		for (var i = 0; i < win.frames.length; ++i) {
			text = this.getSelected(win.frames[i]);
			if (text.length > 0) return text;
		}
		return '';
	},

	clearSelected: function(win) {
		var s = win.getSelection();
		if (s) s.removeAllRanges();
		for (var i = 0; i < win.frames.length; ++i) {
			this.clearSelected(win.frames[i]);
		}
	},


	lbHide: function() {
		document.getElementById('rikaichan-lbar').hidden = true;
		this.hidePopup();
		rcxData.done();
		this.lbText.value = '';
	},

	lbToggle: function() {
		let text = rcxConfig.selinlb ? this.getSelected(window.content).substr(0, 30) : '';
		this.lbText = document.getElementById('rcx-lookupbar-text');

		let e = document.getElementById('rikaichan-lbar');
		if (e.hidden) {
			// FF only
			if ((rcxConfig._bottomlb == true) != rcxConfig.bottomlb) {
				rcxConfig._bottomlb = rcxConfig.bottomlb;

				if (rcxConfig.bottomlb) {
					let bottom = document.getElementById('browser-bottombox');
					if ((bottom) && (e.parentNode != bottom)) {
						e.parentNode.removeChild(e);
						e.setAttribute('ordinal', 0);
						bottom.insertBefore(e, bottom.firstChild);
					}
				}
				else {
					let top = document.getElementById('navigator-toolbox');
					if ((top) && (e.parentNode != top)) {
						e.parentNode.removeChild(e);
						e.setAttribute('ordinal', 1000);
						top.appendChild(e);
					}
				}
			}

			e.hidden = false;
			this.lbText.focus();
		}
		else if (!this.lbText.getAttribute("focused")) {
			this.lbText.focus();
		}
		else if ((text.length == 0) || (text == this.lbLast)) {
			this.lbHide();
			return;
		}

		this.lbSearchButton();
	},

	lbKeyPress: function(ev) {
		switch (ev.keyCode) {
		case 13:
			this.lookupSearch(this.lbText.value);
			ev.stopPropagation();
			break;
		case 27:
			if (this.isVisible()) this.hidePopup();
				else this.lbToggle();
			ev.stopPropagation();
			break;
		}
	},

	lbSearchButton: function() {
		if (rcxConfig.selinlb) {
			let text = this.getSelected(window.content).substr(0, 30);
			if (text.length) {
				this.lbText.value = text;
				this.clearSelected(window.content);
			}
		}

		this.lookupSearch(this.lbText.value);

		this.lbText.select();
		this.lbText.focus();
	},

	lookupSearch: function(text) {
		let s = text.replace(/^\s+|\s+$/g, '');
		if (!s.length) return;

		if ((this.lbLast == s) && (this.isVisible())) {
			rcxData.selectNext();
		}
		else {
			this.lbLast = s;
			rcxData.select(0);
		}

		if ((s.length == 0) || (!this.initDictionary())) {
			this.hidePopup();
		}
		else {
			let result;
			let html;
			if ((s.search(/^:/) != -1) || (s.search(/^([^\u3000-\uFFFF]+)$/) != -1)) {
				// ":word"  = force a text search of "word"
				result = rcxData.textSearch(s.replace(/^:/, ''));
			}
			else {
				result = rcxData.wordSearch(s, true);
			}
			if (result) {
				html = rcxData.makeHtml(result);
				this.lastFound = [result];
			}
			else {
				html = '\u300C ' + s + ' \u300D was not found.';
				this.lastFound = [];
			}
			this.lastFound.fromLB = 1;

			let kanji = '';
			let have = {};
			let t = s + html;
			for (let i = 0; i < t.length; ++i) {
				let c = t.charCodeAt(i);
				if ((c >= 0x3000) && (c <= 0xFFFF)) {
					c = t.charAt(i);
					if (!have[c]) {
						result = rcxData.kanjiSearch(c);
						if (result) {
							this.lastFound.push(result);
							have[c] = 1;
							kanji += '<td class="q-k">' + rcxData.makeHtml(result) + '</td>';
						}
					}
				}
			}

			this.showPopup('<table class="q-tb"><tr><td class="q-w">' + html + '</td>' + kanji + '</tr></table>', null, null, true);
		}
	},

	lookupBoxKey: function(ev) {
		switch (ev.keyCode) {
		case 13:
			this.lookupSearch(ev.target.value);
			ev.stopPropagation();
			break;
		case 27:
			if (this.isVisible()) this.hidePopup();
			ev.target.value = "";
			ev.stopPropagation();
			break;
		}
	},

	statusClick: function(ev) {
		if (ev.button != 2) rcxMain.toggle();
	},

	statusTimer: null,

	status: function(text) {
		if (this.statusTimer) {
			clearTimeout(this.statusTimer);
			this.statusTimer = null;
		}
		var e = document.getElementById('rikaichan-status-text');
		if (e) {
			e.setAttribute('label', text.substr(0, 80));
			e.setAttribute('hidden', 'false');
			this.statusTimer = setTimeout(function() { e.setAttribute('hidden', 'true') }, 3000);
		}
	}
};

/*
var rcxLookupBar = {
};
*/

var rcxConfig = {
	observer: {
		observe: function(subject, topic, data) {
			if (topic == 'nsPref:changed') rcxConfig.load();
		},
		start: function() {
			Components.classes['@mozilla.org/preferences-service;1']
				.getService(Components.interfaces.nsIPrefBranch)
				.QueryInterface(Components.interfaces.nsIPrefBranch2)
				.addObserver('extensions.rikaichan.', this, false);
		},
		stop: function() {
			Components.classes['@mozilla.org/preferences-service;1']
					.getService(Components.interfaces.nsIPrefBranch)
					.QueryInterface(Components.interfaces.nsIPrefBranch2)
					.removeObserver('extensions.rikaichan.', this);
		}
	},

	load: function() {
		let p = new rcxPrefs();

		// fix 1.xx -> 2.xx
		try {
			if (p.branch.getPrefType('wpos') != p.branch.PREF_BOOL) {
				p.branch.clearUserPref('wpos');
			}
		}
		catch (ex) {
		}


		for (let i = rcxConfigList.length - 1; i >= 0; --i) {
			let [type, name] = rcxConfigList[i];
			switch (type) {
			case 0:
				rcxConfig[name] = p.getInt(name, null);
				break;
			case 1:
				rcxConfig[name] = p.getString(name, '');
				break;
			case 2:
				rcxConfig[name] = p.getBool(name, null);
				break;
			}
		}

		['cm', 'tm'].forEach(function(name) {
			let a = !rcxConfig[name + 'toggle'];
			let e = document.getElementById('rikaichan-toggle-' + name);
			if (e) e.hidden = a;

			let b = !rcxConfig[name + 'lbar'];
			e = document.getElementById('rikaichan-lbar-' + name);
			if (e) e.hidden = b;

			e = document.getElementById('rikaichan-separator-' + name);
			if (e) e.hidden = a || b;
		}, this);

		rcxConfig.css = (rcxConfig.css.indexOf('/') == -1) ? ('chrome://rikaichan/skin/popup-' + rcxConfig.css + '.css') : rcxConfig.css;
		if (rcxMain.isTB) {
			rcxConfig.enmode = 1;
		}
		else {
			for (let i = gBrowser.browsers.length - 1; i >= 0; --i) {
				let e = gBrowser.browsers[i].contentDocument.getElementById('rikaichan-css');
				if (e) e.setAttribute('href', rcxConfig.css);
			}
		}

		let e = document.getElementById('rikaichan-status');
		if (e) e.hidden = (rcxConfig.sticon == 0);

		if ((rcxConfig._bottomlb == true) != rcxConfig.bottomlb) {
			// switch it later, not at every change/startup
			e = document.getElementById('rikaichan-lbar');
			if (e) e.hidden = true;
		}

		rcxData.loadConfig();
	}
};

/*
var rcxDebug = {
	echo: function(text) {
		Components.classes['@mozilla.org/consoleservice;1']
			.getService(Components.interfaces.nsIConsoleService)
			.logStringMessage(text);
			if (!rcxDebug.consoneOnce) {
				//	toJavaScriptConsole();
				rcxDebug.consoneOnce = 1;
			}
	},

	status: function(text) {
		if (rcxDebug.stimer) {
			clearTimeout(rcxDebug.stimer);
			rcxDebug.stimer = null;
		}

		var e = document.getElementById('rikaichan-status-text');
		if (text) {
			e.setAttribute('label', text);
			e.setAttribute('hidden', false);
			rcxDebug.stimer = setTimeout(rcxDebug.status, 5000);
		}
		else {
			e.setAttribute('hidden', true);
		}
	},

	dumpObj: function(o) {
		rcxDebug.echo('[' + o + ']');
		for (var key in o) {
			try {
				rcxDebug.echo(key + '=' + String(o[key]).replace(/[\r\n\t]/g, ' ') + '\r\n');
			}
			catch (ex) {
				rcxDebug.echo(key + '=<exception: ' + ex + '>');
			}
		}
	},

	clip: function(text) {
		Components.classes['@mozilla.org/widget/clipboardhelper;1']
			.getService(Components.interfaces.nsIClipboardHelper)
			.copyString(text);
	}
};
*/

rcxMain.init();
