wp.customize.sectionConstructor.rm_simple_upsell_section =
	wp.customize.Section.extend({
		// No events for this type of section.
		attachEvents() {},

		// Always make the section active.
		isContextuallyActive() {
			return true;
		},
	});
