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

const addFrame = (dataUrl) => {
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

	frameList.insertBefore(img, frameList.querySelector("div.frame.camera"));
};

const selectCamera = () => {
	frameList
		.querySelectorAll(".active")
		.forEach((el) => el.classList.remove("active"));
	cameraFeed.classList.remove("hidden");
	captureBtn.disabled = false;
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

	let frame = 0;
	const interval = setInterval(() => {
		// imageOperator.clearRect(0, 0, width, height);
		if (frameList.children[frame] == null) {
			clearInterval(interval);
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
	}, 200);
});
