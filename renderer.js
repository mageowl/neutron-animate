/** @type {HTMLVideoElement} */
const cameraFeed = document.querySelector("video#camera");
/** @type {HTMLButtonElement} */
const captureBtn = document.querySelector("button#capture");
/** @type {HTMLCanvasElement} */
const imageOperatorEl = document.querySelector("canvas#imageOp");
/** @type {CanvasRenderingContext2D} */
const imageOperator = imageOperatorEl.getContext("2d");
/** @type {HTMLDivElement} */
const frameList = document.querySelector("div#frame-list");
/** @type {HTMLSpanElement} */
const playButton = document.querySelector("span#play-button");
/** @type {HTMLSpanElement} */
const trashButton = document.querySelector("span#trash-button");
/** @type {HTMLSpanElement} */
const videoSettingsButton = document.querySelector(
	"span#video-settings-button"
);

let selectedFrame = -1;
let playInterval = null;
let fps = 5;

const addFrame = (dataUrl, index = frameList.children.length - 1) => {
	const img = document.createElement("img");
	img.src = dataUrl;
	img.classList.add("frame");

	img.addEventListener("click", () => {
		cameraFeed.classList.remove("hidden");
		frameList
			.querySelectorAll(".active")
			.forEach((el) => el.classList.remove("active"));
		img.classList.add("active");

		const { width, height } = cameraFeed.getBoundingClientRect();
		const { width: streamWidth, height: streamHeight } = cameraStream
			.getTracks()[0]
			.getSettings();

		cameraFeed.classList.add("hidden");
		captureBtn.disabled = true;
		trashButton.innerText = "delete";
		selectedFrame = index;

		const ratio = Math.max(streamWidth / width, streamHeight / height);
		const [drawWidth, drawHeight] = [streamWidth / ratio, streamHeight / ratio];
		const [offsetX, offsetY] = [
			(width - drawWidth) / 2,
			(height - drawHeight) / 2
		];

		imageOperatorEl.width = width;
		imageOperatorEl.height = height;
		imageOperator.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
	});

	frameList.insertBefore(img, frameList.children[index]);
};

const selectCamera = () => {
	frameList
		.querySelectorAll(".active")
		.forEach((el) => el.classList.remove("active"));
	cameraFeed.classList.remove("hidden");
	captureBtn.disabled = false;
	trashButton.innerText = "undo";
	selectedFrame = -1;
};

const downloadURI = (uri, name) => {
	console.log(uri);
	const link = document.createElement("a");
	link.download = name;
	link.href = uri;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

const exportVideo = () => {
	const { width, height } = cameraFeed.getBoundingClientRect();
	const { width: streamWidth, height: streamHeight } = cameraStream
		.getTracks()[0]
		.getSettings();
	imageOperatorEl.width = width;
	imageOperatorEl.height = height;
	imageOperator.clearRect(0, 0, width, height);

	const ratio = Math.max(streamWidth / width, streamHeight / height);
	const [drawWidth, drawHeight] = [streamWidth / ratio, streamHeight / ratio];
	const [offsetX, offsetY] = [
		(width - drawWidth) / 2,
		(height - drawHeight) / 2
	];

	cameraFeed.classList.add("hidden");
	captureBtn.disabled = true;
	playButton.innerText = "downloading";

	const videoStream = imageOperatorEl.captureStream(0);
	const mediaRecorder = new MediaRecorder(videoStream);

	let chunks = [];
	mediaRecorder.addEventListener("dataavailable", (e) => {
		chunks.push(e.data);
	});
	mediaRecorder.addEventListener("stop", () => {
		const blob = new Blob(chunks, { type: "video/mp4" }); // other types are available such as 'video/webm' for instance, see the doc for more info
		chunks = [];
		const url = URL.createObjectURL(blob);
		console.log(url);
		downloadURI(url, "my-video.mp4");
	});

	let frame = 0;
	mediaRecorder.start();
	playInterval = setInterval(() => {
		// imageOperator.clearRect(0, 0, width, height);
		if (frameList.children[frame] == null) {
			clearInterval(playInterval);
			mediaRecorder.stop();
			playButton.innerText = "play_arrow";
			selectCamera();
			return;
		} else if (frameList.children[frame].classList.contains("camera")) {
			frame++;
			return;
		}

		imageOperator.drawImage(
			frameList.children[frame],
			offsetX,
			offsetY,
			drawWidth,
			drawHeight
		);
		frame++;

		videoStream.getVideoTracks()[0].requestFrame();
	}, 1000 / fps);
};

let capturing = false;
/** @type {MediaStream} */
let cameraStream = null;

navigator.mediaDevices
	.getUserMedia({ video: true })
	.then((stream) => {
		cameraFeed.srcObject = stream;
		cameraFeed.play();
		cameraStream = stream;
	})
	.catch((err) => {
		console.log("u bad boi.", err);
	});

window.addEventListener("keydown", ({ key }) => {
	if (key === " ") {
		captureBtn.classList.add("clicked");
		captureBtn.click();
	}
});

captureBtn.addEventListener("mousedown", () => {
	captureBtn.classList.add("clicked");
});

captureBtn.addEventListener("click", () => {
	if (capturing) return;
	capturing = true;

	setTimeout(() => {
		cameraFeed.classList.add("capture");
		cameraFeed.pause();
		captureBtn.classList.remove("clicked");
		setTimeout(() => {
			cameraFeed.classList.remove("capture");
			setTimeout(() => {
				cameraFeed.play();
				capturing = false;
			}, 100);
		}, 100);
	}, 200);

	const { width, height } = cameraStream.getTracks()[0].getSettings();
	imageOperatorEl.width = width;
	imageOperatorEl.height = height;
	imageOperator.drawImage(cameraFeed, 0, 0, width, height);
	addFrame(imageOperatorEl.toDataURL("image/png"));
});

playButton.addEventListener("click", () => {
	if (playButton.innerText === "pause") {
		clearInterval(playInterval);
		selectCamera();
		playButton.innerText = "play_arrow";
		return;
	} else if (playButton.innerText !== "play_arrow") return;

	const { width, height } = cameraFeed.getBoundingClientRect();
	const { width: streamWidth, height: streamHeight } = cameraStream
		.getTracks()[0]
		.getSettings();
	imageOperatorEl.width = width;
	imageOperatorEl.height = height;
	imageOperator.clearRect(0, 0, width, height);

	const ratio = Math.max(streamWidth / width, streamHeight / height);
	const [drawWidth, drawHeight] = [streamWidth / ratio, streamHeight / ratio];
	const [offsetX, offsetY] = [
		(width - drawWidth) / 2,
		(height - drawHeight) / 2
	];

	cameraFeed.classList.add("hidden");
	captureBtn.disabled = true;
	playButton.innerText = "pause";

	let frame = 0;
	playInterval = setInterval(() => {
		// imageOperator.clearRect(0, 0, width, height);
		if (frameList.children[frame] == null) {
			clearInterval(playInterval);
			playButton.innerText = "play_arrow";
			selectCamera();
			return;
		} else if (frameList.children[frame].classList.contains("camera")) {
			frame++;
			return;
		}

		imageOperator.drawImage(
			frameList.children[frame],
			offsetX,
			offsetY,
			drawWidth,
			drawHeight
		);
		frame++;
	}, 1000 / fps);
});

trashButton.addEventListener("click", () => {
	const index =
		selectedFrame === -1 ? frameList.children.length - 2 : selectedFrame;

	if (index >= 0) frameList.children[index].remove();
	if (selectedFrame !== -1) selectCamera();
});

videoSettingsButton.addEventListener("click", () => {
	const settingsWindow = open(
		"settings.html",
		"_blank",
		"width=700,height=500,left=100,top=100"
	);

	console.log("sending");

	addEventListener("message", (event) => {
		if (event.origin !== `${location.protocol}//${location.host}`) {
			console.log(event.origin);
			return;
		}

		if (event.data.action === "pref") {
			fps = event.data.fps;
		} else exportVideo();
	});

	settingsWindow.addEventListener("load", () =>
		settingsWindow.postMessage({ fps })
	);
});
