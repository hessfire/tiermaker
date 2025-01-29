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
	if (/^-?\d+$/.test(artist_name)) return artist_name;
	const artist_response = await jsonp_request(`https://api.deezer.com/search?output=jsonp&q=artist:%22${artist_name}%22`);
	for (const thing of artist_response.data) {
		if (thing.artist.name.toLowerCase() === artist_name.toLowerCase()) return thing.artist.id;
	}
	return 0;
}

async function deezer_artworks(artist_id) {
  const result = {};
  let artist_name = "";
  let url = `https://api.deezer.com/artist/${artist_id}/albums?output=jsonp`;

  try {
    const artist_response = await jsonp_request(`https://api.deezer.com/artist/${artist_id}?output=jsonp`);
    artist_name = artist_response.name;
    document.title = `${artist_name} tiermaker`;

    while (url) {
      const album_response = await jsonp_request(url);

      for (const album of album_response.data) {
        let tracklist_url = `${album.tracklist}?output=jsonp`;
        let tracklist = await jsonp_request(tracklist_url);

        const all_tracks = [];

        while (tracklist) {
          all_tracks.push(...tracklist.data);
          tracklist_url = tracklist.next ? `${tracklist.next}&output=jsonp` : null;
          tracklist = tracklist_url ? await jsonp_request(tracklist_url) : null;
        }

        if (all_tracks.length === 1) {
          result[album.id] = [album.title, album.cover_medium, all_tracks[0].preview];
          continue;
        }

        for (const track of all_tracks) {
          if (track.title in result) continue;
          result[track.id] = [track.title, album.cover_medium, track.preview];
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
	var url_params = new URLSearchParams(window.location.search);
	search_artists_by_name(url_params.get('q')).then((artist_id) => {
		deezer_artworks(artist_id).then((data) => {
			source = document.getElementsByClassName("source")[0];
	
			for (const release of Object.entries(data)) {
				var div = document.createElement('div');
				div.className = "elemdiv";
				div.id = release[0];
	
				var img = document.createElement('img');
				img.src = release[1][1];
				img.className = "artwork";
				img.width = 64;
				img.height = 64;
	
				var title = document.createElement('a');
				title.textContent = release[1][0];
				title.className = "title";
				title.draggable = true;
				title.addEventListener("dragstart", dragStart);
	
				var preview_url = document.createElement('a');
				preview_url.href = release[1][2];
				preview_url.className = "preview_url";
				preview_url.style = "font-size: 0px; display: none;"

				div.appendChild(img);
				div.appendChild(preview_url);
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
	var data = ev.dataTransfer.getData("text");

	if (ev.target.classList.contains("actions") || (ev.target.id && ev.target.id.includes("action"))) {
		const audio = document.getElementById("audio_player");
        const source = document.getElementById("audio_src");
		const player_image = document.getElementById("player_image");
		const player_div = document.getElementsByClassName("player")[0];
		player_div.style = "display: flex;";

		player_image.src = document.getElementById(data).getElementsByClassName("artwork")[0].src;
		var preview_url = document.getElementById(data).getElementsByClassName("preview_url")[0].href;
		source.src = preview_url;
		audio.load();
		audio.volume = 0.1;
		audio.play();

		audio.addEventListener("pause", function() { 
			player_div.style = "display: none;";
		});

		return;
	}

	if (ev.target.className.includes("tier_")) return;

	if (ev.target.nodeName == "A" || ev.target.nodeName == "IMG" || ev.target.nodeName == "H1") {
		var data = ev.dataTransfer.getData("text");
		console.log(data);
		ev.target.parentElement.parentElement.appendChild(document.getElementById(data));
		return;
	}

	console.log(data);
	ev.target.appendChild(document.getElementById(data));
}