/*

	Rikaichan
	Copyright (C) 2005-2012 Jonathan Zarate
	http://www.polarcloud.com/

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

/*
  Rikaisama
  Author:  Christopher Brochtrup
  Contact: cb4960@gmail.com
  Website: http://rikaisama.sourceforge.net/
*/

// 0 = integer, 1 = string, 2 = checkbox/boolean
var rcxConfigList = [
	// general
	[1, 'css'],
	[0, 'enmode'],
	[2, 'highlight'],
	[2, 'title'],
	[2, 'selinlb'],
	[2, 'bottomlb'],
	[2, 'resizedoc'],
	[2, 'sticon'],
	[2, 'minihelp'],
	[0, 'volume'],
	[2, 'autoplayaudio'],
	[2, 'enablenoaudioclip'],
	[0, 'opacity'],
	[2, 'roundedcorners'],
  [2, 'mergedivs'],
    
  // startup
	[2, 'startlookupbar'],
	[2, 'startepwing'],
	[2, 'startsanseido'],
	[2, 'startsticky'],
	[2, 'startsupersticky'],
  
	// menus
	[2, 'tmtoggle'],
	[2, 'tmlbar'],
	[2, 'cmtoggle'],
	[2, 'cmlbar'],

	// keyboard
	[2, 'nopopkeys'],
	[1, 'kbalternateview'],
	[1, 'kbstickypopup'],
	[1, 'kbmovepopupdown'],
	[1, 'kbcopytoclipboard'],
	[1, 'kbsavetofile'],
	[1, 'kbsavetofilekana'],
	[1, 'kbhideshowdefinitions'],
	[1, 'kbpreviouscharacter'],
	[1, 'kbnextcharacter'],
	[1, 'kbnextword'],
	[1, 'kbjdicaudio'],
	[1, 'kbsanseidomode'],
	[1, 'kbepwingmode'],
	[1, 'kbrealtimeimport'],
	[1, 'kbrealtimeimportkana'],
	[1, 'kbsuperstickymode'],
	[1, 'kbeditnotes'],
	[1, 'kbepwingnextdic'],
	[1, 'kbepwingprevdic'],
	[1, 'kbepwingnextentry'],
	[1, 'kbepwingpreventry'],

	// dictionary
	[2, 'wpos'],					// ! this was an integer in 1.xx: 0=hide, 1=show entry type
	[2, 'wpop'],
	[0, 'wmax'],
	[0, 'namax'],
	[2, 'hidex'],
	[2, 'showfreq'],
	[2, 'showpitchaccent'],
	[2, 'hidepitchaccentpos'],
	
	// kanji
	[1, 'kindex'],
  
	// epwing
	[1, 'epwingpath1'],
	[1, 'epwingpath2'],
	[1, 'epwingpath3'],
	[1, 'epwingpath4'],
	[1, 'epwingfallback'],
	[0, 'epwingmaxlines'],
	[2, 'epwingshowconjugation'],
	[2, 'epwingshowdicnum'],
	[2, 'epwingstripnewlines'],
	[1, 'epwingremoveregex'],
	[2, 'epwingaddcolorandpitch'],
  
	// clipboard / save file
	[1, 'sfile'],
	[1, 'audiodir'],
	[2, 'saveaudioonplay'],
	[1, 'sfcs'],
	[2, 'ubom'],
	[0, 'smaxfe'],
	[0, 'smaxfk'],
	[0, 'smaxce'],
	[0, 'smaxck'],
	[0, 'snlf'],
	[1, 'ssep'],
	[1, 'atags'],
	[1, 'savenotes'],
	[1, 'saveformat'],
  
  // Vocab
	[1, 'vocabknownwordslistfile'],
	[0, 'vocabknownwordslistcolumn'],
  [1, 'vocabtodowordslistfile'],
	[0, 'vocabtodowordslistcolumn'],

  // Anki
	[1, 'rtifieldnamestext'],
	[2, 'rtisaveaudio'],
	[0, 'rtiudpport'],
  
	// not in GUI
	[0, 'popdelay'],
	[2, 'hidedef'],
	[2, 'checkversion'],
//	[2, 'sticky']
];



function rcxPrefs() {
	this.branch = Components.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefService)
		.getBranch('rikaichan.');
}

rcxPrefs.prototype = {
	getString: function(key) {
		return this.branch.getComplexValue(key, Components.interfaces.nsISupportsString).data;
	},

	setString: function(key, value) {
		let s = Components.classes['@mozilla.org/supports-string;1']
			.createInstance(Components.interfaces.nsISupportsString);
		s.data = value;
		this.branch.setComplexValue(key, Components.interfaces.nsISupportsString, s);
	},

	getInt: function(key) {
		return this.branch.getIntPref(key)
	},

	setInt: function(key, value) {
		this.branch.setIntPref(key, value)
	},

	getBool: function(key) {
		return this.branch.getBoolPref(key)
	},

	setBool: function(key, value) {
		this.branch.setBoolPref(key, value)
	}
};
