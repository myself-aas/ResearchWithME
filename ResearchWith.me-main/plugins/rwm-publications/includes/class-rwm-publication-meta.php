<?php
/**
 * Publication Meta Boxes and Fields.
 *
 * @package RWM_Publications
 */

namespace RWM_Publications;

defined( 'ABSPATH' ) || exit;

/**
 * Class Publication_Meta
 *
 * Adds meta boxes for DOI, ORCID, authors, license, and other scholarly fields.
 */
class Publication_Meta {

	/**
	 * Singleton instance.
	 *
	 * @var Publication_Meta|null
	 */
	private static $instance = null;

	/**
	 * Meta keys.
	 */
	const META_DOI        = '_rwm_doi';
	const META_AUTHORS    = 'reme_paper_authors';
	const META_LICENSE    = '_rwm_pdf_license';
	const META_JOURNAL    = '_rwm_journal';
	const META_VOLUME     = '_rwm_volume';
	const META_ISSUE      = '_rwm_issue';
	const META_PAGES      = '_rwm_pages';
	const META_PUBLISHED  = '_rwm_published_date';
	const META_ORCID      = '_rwm_author_orcid';
	const META_DATA_URL   = '_rwm_data_url';
	const META_FUNDING    = '_rwm_funding';

	/**
	 * Get the singleton instance.
	 *
	 * @return Publication_Meta
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ) );
		add_action( 'save_post', array( $this, 'save_meta' ), 10, 3 );
		add_action( 'rest_prepare_publication', array( $this, 'rest_prepare' ), 10, 3 );
		add_action( 'show_user_profile', array( $this, 'add_orcid_user_field' ) );
		add_action( 'edit_user_profile', array( $this, 'add_orcid_user_field' ) );
		add_action( 'personal_options_update', array( $this, 'save_orcid_user_field' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_orcid_user_field' ) );
	}

	/**
	 * Add meta boxes for the publication post type.
	 *
	 * @return void
	 */
	public function add_meta_boxes() {
		add_meta_box(
			'reme_publication_metadata',
			__( 'Publication Metadata', 'rwm-publications' ),
			array( $this, 'render_meta_box' ),
			'publication',
			'normal',
			'high'
		);
	}

	/**
	 * Render the publication metadata meta box.
	 *
	 * @param \WP_Post $post Post object.
	 * @return void
	 */
	public function render_meta_box( $post ) {
		wp_nonce_field( 'reme_publication_meta', 'reme_publication_meta_nonce' );

		$doi        = get_post_meta( $post->ID, self::META_DOI, true );
		$authors    = get_post_meta( $post->ID, self::META_AUTHORS, true );
		$license    = get_post_meta( $post->ID, self::META_LICENSE, true );
		$journal    = get_post_meta( $post->ID, self::META_JOURNAL, true );
		$volume     = get_post_meta( $post->ID, self::META_VOLUME, true );
		$issue      = get_post_meta( $post->ID, self::META_ISSUE, true );
		$pages      = get_post_meta( $post->ID, self::META_PAGES, true );
		$published  = get_post_meta( $post->ID, self::META_PUBLISHED, true );
		$orcid      = get_post_meta( $post->ID, self::META_ORCID, true );
		$data_url   = get_post_meta( $post->ID, self::META_DATA_URL, true );
		$funding    = get_post_meta( $post->ID, self::META_FUNDING, true );

		?>
		<table class="form-table">
			<tr>
				<th scope="row"><label for="reme_doi"><?php esc_html_e( 'DOI', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_doi" name="reme_doi" value="<?php echo esc_attr( $doi ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'Persistent DOI (e.g. 10.1000/rwm.2026.0418)', 'rwm-publications' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_authors"><?php esc_html_e( 'Authors', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_authors" name="reme_authors" value="<?php echo esc_attr( $authors ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'Comma-separated list of authors.', 'rwm-publications' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_license"><?php esc_html_e( 'License', 'rwm-publications' ); ?></label></th>
				<td>
					<select id="reme_license" name="reme_license" class="regular-text">
						<option value="CC-BY 4.0"<?php selected( $license, 'CC-BY 4.0' ); ?>><?php esc_html_e( 'CC-BY 4.0', 'rwm-publications' ); ?></option>
						<option value="CC-BY-SA 4.0"<?php selected( $license, 'CC-BY-SA 4.0' ); ?>><?php esc_html_e( 'CC-BY-SA 4.0', 'rwm-publications' ); ?></option>
						<option value="CC-BY-NC 4.0"<?php selected( $license, 'CC-BY-NC 4.0' ); ?>><?php esc_html_e( 'CC-BY-NC 4.0', 'rwm-publications' ); ?></option>
						<option value="CC0 1.0"<?php selected( $license, 'CC0 1.0' ); ?>><?php esc_html_e( 'CC0 1.0', 'rwm-publications' ); ?></option>
						<option value="All Rights Reserved"<?php selected( $license, 'All Rights Reserved' ); ?>><?php esc_html_e( 'All Rights Reserved', 'rwm-publications' ); ?></option>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_journal"><?php esc_html_e( 'Journal', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_journal" name="reme_journal" value="<?php echo esc_attr( $journal ); ?>" class="regular-text" />
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_volume"><?php esc_html_e( 'Volume', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_volume" name="reme_volume" value="<?php echo esc_attr( $volume ); ?>" class="regular-text" />
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_issue"><?php esc_html_e( 'Issue', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_issue" name="reme_issue" value="<?php echo esc_attr( $issue ); ?>" class="regular-text" />
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_pages"><?php esc_html_e( 'Pages', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_pages" name="reme_pages" value="<?php echo esc_attr( $pages ); ?>" class="regular-text" />
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_published"><?php esc_html_e( 'Published Date', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="date" id="reme_published" name="reme_published" value="<?php echo esc_attr( $published ); ?>" class="regular-text" />
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_orcid"><?php esc_html_e( 'Author ORCID', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_orcid" name="reme_orcid" value="<?php echo esc_attr( $orcid ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'Author ORCID iD (e.g. 0000-0002-1825-0097)', 'rwm-publications' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_data_url"><?php esc_html_e( 'Data URL', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="url" id="reme_data_url" name="reme_data_url" value="<?php echo esc_attr( $data_url ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'URL to the research data repository.', 'rwm-publications' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="reme_funding"><?php esc_html_e( 'Funding', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" id="reme_funding" name="reme_funding" value="<?php echo esc_attr( $funding ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'Funding source and grant number.', 'rwm-publications' ); ?></p>
				</td>
			</tr>
		</table>
		<?php
	}

	/**
	 * Save publication meta fields.
	 *
	 * @param int     $post_id Post ID.
	 * @param \WP_Post $post Post object.
	 * @param bool    $update Whether this is an update.
	 * @return void
	 */
	public function save_meta( $post_id, $post, $update ) {
		if ( ! isset( $_POST['reme_publication_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['reme_publication_meta_nonce'] ), 'reme_publication_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$fields = array(
			self::META_DOI,
			self::META_AUTHORS,
			self::META_LICENSE,
			self::META_JOURNAL,
			self::META_VOLUME,
			self::META_ISSUE,
			self::META_PAGES,
			self::META_PUBLISHED,
			self::META_ORCID,
			self::META_DATA_URL,
			self::META_FUNDING,
		);

		foreach ( $fields as $field ) {
			if ( isset( $_POST[ str_replace( '_rwm_', 'reme_', $field ) ] ) || isset( $_POST[ $field ] ) ) {
				$key = str_replace( '_rwm_', 'reme_', $field );
				if ( ! isset( $_POST[ $key ] ) ) {
					$key = $field;
				}
				$value = sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
				update_post_meta( $post_id, $field, $value );
			}
		}
	}

	/**
	 * Add ORCID field to user profile.
	 *
	 * @param \WP_User $user User object.
	 * @return void
	 */
	public function add_orcid_user_field( $user ) {
		?>
		<h3><?php esc_html_e( 'Researcher Profile', 'rwm-publications' ); ?></h3>
		<table class="form-table">
			<tr>
				<th><label for="orcid_id"><?php esc_html_e( 'ORCID iD', 'rwm-publications' ); ?></label></th>
				<td>
					<input type="text" name="orcid_id" id="orcid_id" value="<?php echo esc_attr( get_user_meta( $user->ID, 'orcid_id', true ) ); ?>" class="regular-text" />
					<p class="description"><?php esc_html_e( 'ORCID iD (e.g. 0000-0002-1825-0097)', 'rwm-publications' ); ?></p>
				</td>
			</tr>
			<?php
			foreach ( array( 'google_scholar', 'researchgate', 'linkedin', 'mastodon', 'website' ) as $key ) {
				$label = ucwords( str_replace( '_', ' ', $key ) );
				?>
				<tr>
					<th><label for="rwm_profile_<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label></th>
					<td>
						<input type="url" name="rwm_profile_<?php echo esc_attr( $key ); ?>" id="rwm_profile_<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( get_user_meta( $user->ID, 'rwm_profile_' . $key, true ) ); ?>" class="regular-text" />
					</td>
				</tr>
				<?php
			}
			?>
		</table>
		<?php
	}

	/**
	 * Save ORCID user field.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function save_orcid_user_field( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) ) {
			return;
		}

		if ( isset( $_POST['orcid_id'] ) ) {
			update_user_meta( $user_id, 'orcid_id', sanitize_text_field( wp_unslash( $_POST['orcid_id'] ) ) );
		}

		foreach ( array( 'google_scholar', 'researchgate', 'linkedin', 'mastodon', 'website' ) as $key ) {
			if ( isset( $_POST[ 'rwm_profile_' . $key ] ) ) {
				update_user_meta( $user_id, 'rwm_profile_' . $key, esc_url_raw( wp_unslash( $_POST[ 'rwm_profile_' . $key ] ) ) );
			}
		}
	}

	/**
	 * Prepare REST response with meta fields.
	 *
	 * @param \WP_REST_Response $response Response object.
	 * @param \WP_Post          $post Post object.
	 * @param \WP_REST_Request  $request Request object.
	 * @return \WP_REST_Response
	 */
	public function rest_prepare( $response, $post, $request ) {
		$data = $response->get_data();

		$data['meta'] = array(
			'doi'        => get_post_meta( $post->ID, self::META_DOI, true ),
			'authors'    => get_post_meta( $post->ID, self::META_AUTHORS, true ),
			'license'    => get_post_meta( $post->ID, self::META_LICENSE, true ),
			'journal'    => get_post_meta( $post->ID, self::META_JOURNAL, true ),
			'volume'     => get_post_meta( $post->ID, self::META_VOLUME, true ),
			'issue'      => get_post_meta( $post->ID, self::META_ISSUE, true ),
			'pages'      => get_post_meta( $post->ID, self::META_PAGES, true ),
			'published'  => get_post_meta( $post->ID, self::META_PUBLISHED, true ),
			'orcid'      => get_post_meta( $post->ID, self::META_ORCID, true ),
			'data_url'   => get_post_meta( $post->ID, self::META_DATA_URL, true ),
			'funding'    => get_post_meta( $post->ID, self::META_FUNDING, true ),
		);

		$response->set_data( $data );
		return $response;
	}
}
