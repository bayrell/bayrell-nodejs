/*!
 *  Bayrell Runtime Library
 *
 *  (c) Copyright 2016-2019 "Ildar Bikmamatov" <support@bayrell.org>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0.txt
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var fs = require('fs');

function json_parse(content)
{
	var obj = null;
	if (content == null) return null;
	try{ obj = JSON.parse(content); } catch(e) {}
	return obj;
}
function readFile(path)
{
	var content = null;
	try{ content = fs.readFileSync(path, "utf8"); } catch(e) {} 
	return content; 
}
function isDirectory(path)
{
	return fs.lstatSync(path).isDirectory(); 
}
function getDirectories(path)
{
	return fs.readdirSync(path).map( (s) => path + "/" + s ).filter(isDirectory);
}


module.exports = function (class_name)
{
	if (module.exports.modules[class_name] != undefined)
	{
		return module.exports.modules[class_name];
	}
	
	var arr = class_name.split(".");
	for (var i=arr.length-1; i>0; i--)
	{
		var module_name = arr.slice(0, i).join(".");
		
		try
		{
			var m_path = module.exports.resolve(module_name);
			if (m_path != null)
			{
				var m = require(m_path);
				var a = class_name.split(".").slice(i);
				var o = module.exports.attr(m, a);
				module.exports.modules[class_name] = o;
				return o;
			}
		}
		catch(e) 
		{
		}
		
	}
	
	return null;
}

module.exports.include_src_path = [];
module.exports.packages_cache = null;
module.exports.modules = {};
module.exports.add = function (o)
{
	module.exports.modules[o.getClassName()] = o;
	return o;
}
module.exports.add_export = function (e, o)
{
	var class_name = o.getClassName();
	var arr = class_name.split(".");
	var t = e;
	
	for (var i=0; i<arr.length; i++)
	{
		var s = arr[i];
		if (i == arr.length - 1)
		{
			t[s] = o;
		}
		else
		{
			if (t[s] == undefined) t[s] = {};
			t = t[s];
		}
	}
	
	return e;
}
module.exports.add_exports = function(e, k)
{
	if (k==undefined) k="";
	for (var key in e)
	{
		if (typeof e[key] == "function")
		{
			var class_name = (k != "") ? (k + "." + key) : key;
			module.exports.modules[class_name] = e[key];
		}
		else if (typeof e[key] == "object")
		{
			module.exports.add_exports(e[key], (k != "") ? (k + "." + key) : key);
		}
	}
}
module.exports.resolve = function (module_name)
{
	var path = null;
	module_name = module.exports.convert_to_package_name(module_name);
	
	if (module.exports.packages_cache == null)
	{
		module.exports.packages_cache = module.exports.load_packages();
	}
	
	if (module.exports.packages_cache[module_name])
	{
		return module.exports.packages_cache[module_name].get("path") + "/index.js";
	}
	
	try { path = require.resolve(module_name); } catch(e) {}
	
	return path;
}
module.exports.convert_to_package_name = function (module_name)
{
	module_name = module_name.replace(".", "-").toLowerCase() + "-nodejs";
	if (module_name.substr(0, 7) == "runtime") module_name = "bayrell-" + module_name;
	return module_name;
}
module.exports.load_packages = function()
{
	var arr = module.exports.include_src_path;
	arr = arr.reduce((arr, path) => arr.concat( getDirectories(path) ), []);
	arr = arr.map( (s) => s + "/nodejs" );
	arr = arr.map
	(
		(path) => 
		{ return new Map().set("name", "").set("path", path).set("content", readFile(path + "/package.json")); } 
	);
	arr = arr.filter( (item) => item.get("content") != null );
	arr = arr.map
	(
		(item) => { return item.set("content", json_parse(item.get("content"))); } 
	);
	arr = arr.map
	(
		(item) => { return item.set("name", (item.get("content") != null) ? item.get("content").name : ""); }
	);
	arr = arr.filter( (item) => item.get("name") != "" && item.get("content") != null );
	var obj = {}; arr.forEach( (item) => { obj[item.get("name")] = item } );
	return obj;
}
module.exports.add_src = function(path)
{
	module.exports.include_src_path.push(path);
}
module.exports.attr = function (obj, key)
{
	if (typeof obj == "object")
	{
		var k = key[0];
		if (obj[k] == undefined) return null;
		if (key.length == 1) return obj[k];
		return module.exports.attr(obj[k], key.slice(1));
	}
	return null;
}