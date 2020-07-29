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
var mpath = require('path');

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
	if (!fs.existsSync(path)) return [];
	return fs.readdirSync(path).map( (s) => path + "/" + s ).filter(isDirectory);
}


module.exports = function (class_name)
{
	if (class_name == "Error") return Error;
	if (class_name == "") return null;
	if (module.exports.modules[class_name] != undefined) return module.exports.modules[class_name];
	if (module.exports.modules[class_name] === null) return null;
	var arr = class_name.split(".");
	for (var i=arr.length-1; i>0; i--)
	{
		var module_name = arr.slice(0, i).join(".");
		module_name = module.exports.convert_to_package_name(module_name);
		var m_path = module.exports.resolve(module_name);
		if (m_path != null)
		{
			require(m_path);
			if (module.exports.modules[class_name] != undefined)
			{
				return module.exports.modules[class_name];
			}
		}
	}
	module.exports.modules[class_name] = null;
	return null;
}

module.exports.VERSION = "0.10.0";
module.exports.include_modules_path = [];
module.exports.include_src_path = [];
module.exports.packages_cache = null;
module.exports.modules = {};
module.exports.add = function (o)
{
	if (o == null || o == undefined) return o;
	var class_name = o.getCurrentClassName()
	if (class_name == null || class_name == undefined) return o;
	module.exports.modules[class_name] = o;
	return o;
}
module.exports.add_exports = function(e)
{
	for (var key in e)
	{
		if (typeof e[key] == "function")
		{
			module.exports.add(e[key]);
		}
		else if (typeof e[key] == "object")
		{
			module.exports.add_exports(e[key]);
		}
	}
}
module.exports.add_src = function(path)
{
	module.exports.include_src_path.push(mpath.resolve(path));
}
module.exports.add_modules = function(path)
{
	module.exports.include_modules_path.push(mpath.resolve(path));
}
module.exports.resolve = function (module_name)
{
	var path = null;
	
	if (module.exports.packages_cache == null)
	{
		module.exports.packages_cache = module.exports.load_packages();
	}
	
	if (module.exports.packages_cache[module_name] != undefined)
	{
		return module.exports.packages_cache[module_name].get("path") + "/index.js";
	}
	
	try { path = require.resolve(module_name); } catch(e) {}
	
	return path;
}
module.exports.require = function (module_name)
{
	var m_path = module.exports.resolve(module_name);
	if (m_path == null) return null;
	return require(m_path);
}
module.exports.load = function (module_name)
{
	module_name = module.exports.convert_to_package_name(module_name);
	return module.exports.require(module_name);
}
module.exports.convert_to_package_name = function (module_name)
{
	module_name = module_name.replace(".", "-").toLowerCase() + "-nodejs";
	if (module_name.substr(0, 7) == "runtime") module_name = "bayrell-" + module_name;
	return module_name;
}
module.exports.read_packages = function(arr)
{
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
module.exports.load_packages = function()
{
	/* Include Modules Dir */
	var arr = module.exports.include_modules_path;
	arr = arr.reduce((arr, path) => arr.concat( getDirectories(path) ), []);
	var obj1 = module.exports.read_packages(arr);
	
	/* Include Source Dir */
	var arr = module.exports.include_src_path;
	arr = arr.reduce((arr, path) => arr.concat( getDirectories(path) ), []);
	arr = arr.map( (s) => s + "/nodejs" );
	var obj2 = module.exports.read_packages(arr);
	
	for (var k in obj2) obj1[k] = obj2[k];
	return obj1;
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