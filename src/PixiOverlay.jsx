import { useEffect, useState } from 'react';
//leaflet
import L from 'leaflet';

//pixi-overlay
import * as PIXI from 'pixi.js';
import 'leaflet-pixi-overlay';

import { useLeafletMap } from 'use-leaflet';

PIXI.utils.skipHello();
const PIXILoader = PIXI.Loader.shared;

// https://github.com/pointhi/leaflet-color-markers
const getDefaultMarkerUrl = (color = 'red') => `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`;

const PixiOverlay = ({
	markers,
}) => {
	const [openedPopupData, setOpenedPopupData] = useState(null);
	const [openedTooltipData, setOpenedTooltipData] = useState(null);

	const [openedPopup, setOpenedPopup] = useState(null);
	const [openedTooltip, setOpenedTooltip] = useState(null);

	const [pixiOverlay, setPixiOverlay] = useState(null);
	const [loaded, setLoaded] = useState(false);
	const map = useLeafletMap();

	// load sprites
	useEffect(() => {
		if (!PIXILoader.resources.red) {
			PIXILoader
				.add('red', getDefaultMarkerUrl())
				.add('gold', getDefaultMarkerUrl('gold'))
				.add('grey', getDefaultMarkerUrl('grey'))
				.add('blue', getDefaultMarkerUrl('blue'))
				.add('green', getDefaultMarkerUrl('green'))
				.load(() => setLoaded(true));
		}
		else {
			setLoaded(true);
		}
	}, []);

	// load pixi when map changes
	useEffect(() => {
		let pixiContainer = new PIXI.Container();
		let overlay = L.pixiOverlay(utils => {
			// redraw markers
			const scale = utils.getScale();
			utils.getContainer().children.forEach(child => child.scale.set(1 / scale));

			utils.getRenderer().render(utils.getContainer());
		}, pixiContainer);
		overlay.addTo(map);
		setPixiOverlay(overlay);

		setOpenedPopupData(null);
		setOpenedTooltipData(null);

		return () => pixiContainer.removeChildren();
	}, [map]);

	// draw markers first time in new container
	useEffect(() => {
		if (pixiOverlay && markers && loaded) {
			const utils = pixiOverlay.utils;
			let container = utils.getContainer();
			let renderer = utils.getRenderer();
			let project = utils.latLngToLayerPoint;
			let scale = utils.getScale();

			markers.forEach(marker => {
				const { id, iconColor = 'red', onClick, position, popup, tooltip, popupOpen } = marker;

				const markerTexture = PIXILoader.resources[iconColor].texture;
				//const markerTexture = new PIXI.Texture.fromImage(url);

				markerTexture.anchor = { x: 0.5, y: 1 };

				const markerSprite = new PIXI.Sprite(markerTexture);
				markerSprite.anchor.set(0.5, 1);

				const markerCoords = project(position);
				markerSprite.x = markerCoords.x;
				markerSprite.y = markerCoords.y;

				markerSprite.scale.set(1 / scale);

				if (popupOpen) {
					setOpenedPopupData({
						id,
						offset: [0, -35],
						position,
						content: popup,
						onClick,
					});
				}

				if (popup || onClick || tooltip) {
					markerSprite.interactive = true;
				}

				if (popup || onClick) {
					markerSprite.on('click', () => {
						if (onClick) {
							onClick(id);
						}
					});

					markerSprite.defaultCursor = 'pointer';
					markerSprite.buttonMode = true;
				}

				if (tooltip) {
					markerSprite.on('mouseover', () => {
						setOpenedTooltipData({
							id,
							offset: [0, -35],
							position,
							content: tooltip,
						});
					});

					markerSprite.on('mouseout', () => {
						setOpenedTooltipData(null);
					});
				}

				container.addChild(markerSprite);
			});

			renderer.render(container);
		}

		return () => pixiOverlay && pixiOverlay.utils.getContainer().removeChildren();

	}, [pixiOverlay, markers, loaded]);

	// handle tooltip
	useEffect(() => {
		if (openedTooltip) {
			map.closePopup(openedTooltip);
		}

		if (openedTooltipData && (!openedPopup || !openedPopupData || openedPopupData.id !== openedTooltipData.id)) {
			setOpenedTooltip(openPopup(map, openedTooltipData));
		}

	// we don't want to reload when openedTooltip changes as we'd get a loop
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [openedTooltipData, openedPopupData, map]);

	// handle popup
	useEffect(() => {
		// close only if different popup
		if (openedPopup) {
			map.closePopup(openedPopup);
		}

		// open only if new popup
		if (openedPopupData) {
			setOpenedPopup(openPopup(map, openedPopupData, { autoClose: false }, true));
		}

	// we don't want to reload when whenedPopup changes as we'd get a loop
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [openedPopupData, map]);

	return null;
};

function openPopup (map, data, extraOptions = {}, isPopup) {
	const popup = L.popup({ offset: data.offset, ...extraOptions })
		.setLatLng(data.position)
		.setContent(data.content)
		.openOn(map);

	// TODO don't call onClick if opened a new one
	if (isPopup && data.onClick) {
		popup.on('remove', () => {
			data.onClick(null);
		});
	}

	return popup;
}

export default PixiOverlay;
