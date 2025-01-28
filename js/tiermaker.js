function jsonp_request(url) {
	return new Promise((resolve, reject) => {
	  const callback_name = `jsonpCallback_${Math.random().toString(36).substr(2, 5)}`;
	  window[callback_name] = (data) => {
		delete window[callback_name];
		document.body.removeChild(script);
		resolve(data);
	  };

	  const script = document.createElement('script');
	  script.src = `${url}&callback=${callback_name}`;
	  script.onerror = () => {
		delete window[callback_name];
		document.body.removeChild(script);
		reject(new Error('JSONP request failed'));
	  };
	  document.body.appendChild(script);
	});
  }

async function search_artists_by_name(artist_name) {
	const artist_response = await jsonp_request(`https://api.deezer.com/search?output=jsonp&q=artist:%22${artist_name}%22`);
	for (const thing of artist_response.data) {
		if (thing.artist.name.toLowerCase().includes(artist_name.toLowerCase())) return thing.artist.id;
	}
	return 0;
}

async function deezer_artworks(artistId) {
	const result = {};
	let artist_name = ""; 
	let url = `https://api.deezer.com/artist/${artistId}/albums?output=jsonp`;
  
	try {
	  const artist_response = await jsonp_request(`https://api.deezer.com/artist/${artistId}?output=jsonp`);
	  artist_name = artist_response.name;
	  console.log(`artist name: ${artist_name}`);
	  document.title = `${artist_name} tiermaker`
  
	  while (url) {
		const album_response = await jsonp_request(url);
  
		for (const album of album_response.data) {
		  const tracklist_url = `${album.tracklist}?output=jsonp`;
		  const tracklist = await jsonp_request(tracklist_url);
  
		  //if (Object.keys(result).length >= 3) break;

		  if (tracklist.total === 1) {
			result[album.id] = [album.title, album.cover_medium];
			continue;
		  }
  
		  for (const track of tracklist.data) {
			if (track.title in result) continue;
			result[track.id] = [track.title, album.cover_medium];
		  }
		}
  
		url = album_response.next ? `${album_response.next}&output=jsonp` : null;
	  }
  
	  return result;
	} catch (error) {
	  throw new Error(error);
	}
}
  
document.addEventListener('DOMContentLoaded', function() {
	search_artists_by_name(window.location.pathname.substring(1)).then((artist_id) => {
		deezer_artworks(artist_id).then((data) => {
			source = document.getElementsByClassName("source")[0];
	
			for (const release of Object.entries(data)) {
				var div = document.createElement('div');
				div.className = "elemdiv";
				div.id = release[0];
	
				var img = document.createElement('img');
				img.src = release[1][1];
				img.width = 64;
				img.height = 64;
	
				var title = document.createElement('a');
				title.textContent = release[1][0];
				title.className = "title";
				title.draggable = true;
				title.addEventListener("dragstart", dragStart);
	
				div.appendChild(img);
				div.appendChild(title);
	
				source.appendChild(div);
			} 
	
			setTimeout(() => {
				var loading_div = document.getElementsByClassName("loading")[0];
				loading_div.classList.add("hidden");
				loading_div.addEventListener("transitionend", () => {
					loading_div.remove();
				});
			}, 500);
	
		}).catch(error => {
			console.error('error: ', error);
			(document.getElementsByClassName("loading")[0]).textContent = "likely rate-limited (see console for error message)";
		}); 
	});
});


function allowDrop(ev) {
	ev.preventDefault();
}

function dragStart(ev) {
	var parent_div = ev.target.closest('.elemdiv');
	ev.dataTransfer.setData("text", parent_div.id);
}

function dragDrop(ev) {
	ev.preventDefault();

	if (ev.target.className.includes("tier_")) return;

	if (ev.target.nodeName == "A" || ev.target.nodeName == "IMG" || ev.target.nodeName == "H1") {
		var data = ev.dataTransfer.getData("text");
		console.log(data);
		ev.target.parentElement.parentElement.appendChild(document.getElementById(data));
		return;
	}

	var data = ev.dataTransfer.getData("text");
	console.log(data);
	ev.target.appendChild(document.getElementById(data));
}