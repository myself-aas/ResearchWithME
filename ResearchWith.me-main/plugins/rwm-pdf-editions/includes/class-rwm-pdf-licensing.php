<?php
/**
 * Licensing, Royalties & Rights Management.
 *
 * Enforces scholarly licensing (Creative Commons / All Rights Reserved)
 * and author royalty distribution calculations.
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Licensing
 */
class RWM_PDF_Licensing {

	/**
	 * Recognized Open Science and Scholarly Licenses.
	 */
	const LICENSES = array(
		'CC-BY-4.0'           => array(
			'name'        => 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
			'url'         => 'https://creativecommons.org/licenses/by/4.0/',
			'commercial'  => true,
			'derivatives' => true,
			'badge_text'  => 'CC BY 4.0',
		),
		'CC-BY-SA-4.0'        => array(
			'name'        => 'Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)',
			'url'         => 'https://creativecommons.org/licenses/by-sa/4.0/',
			'commercial'  => true,
			'derivatives' => true,
			'badge_text'  => 'CC BY-SA 4.0',
		),
		'CC-BY-NC-4.0'       => array(
			'name'        => 'Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)',
			'url'         => 'https://creativecommons.org/licenses/by-nc/4.0/',
			'commercial'  => false,
			'derivatives' => true,
			'badge_text'  => 'CC BY-NC 4.0',
		),
		'CC0-1.0'             => array(
			'name'        => 'Creative Commons CC0 1.0 Universal Public Domain Dedication',
			'url'         => 'https://creativecommons.org/publicdomain/zero/1.0/',
			'commercial'  => true,
			'derivatives' => true,
			'badge_text'  => 'CC0 1.0',
		),
		'All-Rights-Reserved' => array(
			'name'        => 'All Rights Reserved (Proprietary / Author Copyright)',
			'url'         => '',
			'commercial'  => false,
			'derivatives' => false,
			'badge_text'  => 'All Rights Reserved',
		),
	);

	/**
	 * Get the active license key for a given post.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string License identifier.
	 */
	public static function get_post_license( $post_id ) {
		$license = get_post_meta( $post_id, '_rwm_pdf_license', true );
		if ( empty( $license ) || ! isset( self::LICENSES[ $license ] ) ) {
			$options = get_option( 'rwm_pdf_settings', array() );
			$license = isset( $options['default_license'] ) ? $options['default_license'] : 'CC-BY-4.0';
		}

		return isset( self::LICENSES[ $license ] ) ? $license : 'CC-BY-4.0';
	}

	/**
	 * Get license details.
	 *
	 * @param string $license_key License key.
	 *
	 * @return array License metadata.
	 */
	public static function get_license_info( $license_key ) {
		if ( isset( self::LICENSES[ $license_key ] ) ) {
			return self::LICENSES[ $license_key ];
		}
		return self::LICENSES['CC-BY-4.0'];
	}

	/**
	 * Generate or retrieve DOI for a post.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string DOI string.
	 */
	public static function get_post_doi( $post_id ) {
		$doi = get_post_meta( $post_id, '_rwm_doi', true );
		if ( ! empty( $doi ) ) {
			return $doi;
		}

		$options = get_option( 'rwm_pdf_settings', array() );
		$prefix  = isset( $options['doi_prefix'] ) && ! empty( $options['doi_prefix'] ) ? $options['doi_prefix'] : '10.5555/rwm';
		$year    = get_the_date( 'Y', $post_id );

		return sprintf( '%s.%s.%d', $prefix, $year, (int) $post_id );
	}

	/**
	 * Calculate royalty distribution for a list of posts in a Special Edition.
	 *
	 * Divides royalty pools based on article word count and author share.
	 *
	 * @param array $posts List of WP_Post objects.
	 * @param float $total_royalty_pool Total royalty budget (in USD / tokens).
	 *
	 * @return array Calculated author breakdown and weights.
	 */
	public static function calculate_edition_royalties( array $posts, $total_royalty_pool = 100.0 ) {
		if ( empty( $posts ) ) {
			return array(
				'total_pool'   => $total_royalty_pool,
				'contributors' => array(),
			);
		}

		$author_data  = array();
		$total_points = 0;

		foreach ( $posts as $post ) {
			$author_id = (int) $post->post_author;
			$word_count = str_word_count( wp_strip_all_tags( $post->post_content ) );
			// Base point 100 per article + 1 point per 100 words.
			$article_points = 100 + floor( $word_count / 100 );

			if ( ! isset( $author_data[ $author_id ] ) ) {
				$user = get_userdata( $author_id );
				$author_data[ $author_id ] = array(
					'author_id'     => $author_id,
					'name'          => $user ? $user->display_name : 'Unknown Author',
					'orcid'         => get_user_meta( $author_id, 'orcid_id', true ),
					'article_count' => 0,
					'total_words'   => 0,
					'points'        => 0,
					'articles'      => array(),
				);
			}

			$author_data[ $author_id ]['article_count']++;
			$author_data[ $author_id ]['total_words'] += $word_count;
			$author_data[ $author_id ]['points']      += $article_points;
			$author_data[ $author_id ]['articles'][]   = array(
				'id'         => $post->ID,
				'title'      => get_the_title( $post ),
				'doi'        => self::get_post_doi( $post->ID ),
				'license'    => self::get_post_license( $post->ID ),
				'word_count' => $word_count,
			);

			$total_points += $article_points;
		}

		// Calculate percentage share and payout.
		foreach ( $author_data as $id => &$author ) {
			$weight                 = ( $total_points > 0 ) ? ( $author['points'] / $total_points ) : 0;
			$author['share_percent'] = round( $weight * 100, 2 );
			$author['payout_amount'] = round( $weight * $total_royalty_pool, 2 );
			$author['verification_token'] = self::generate_verification_token( $author );
		}
		unset( $author );

		return array(
			'total_pool'     => $total_royalty_pool,
			'total_points'   => $total_points,
			'contributor_count' => count( $author_data ),
			'contributors'   => array_values( $author_data ),
		);
	}

	/**
	 * Generate a cryptographic verification hash for royalty proof.
	 *
	 * @param array $author_record Author computation data.
	 *
	 * @return string SHA256 hex string.
	 */
	public static function generate_verification_token( array $author_record ) {
		$payload = sprintf(
			'author:%d|words:%d|pts:%d|share:%s|salt:%s',
			(int) $author_record['author_id'],
			(int) $author_record['total_words'],
			(int) $author_record['points'],
			(string) $author_record['share_percent'],
			wp_salt( 'auth' )
		);

		return hash_hmac( 'sha256', $payload, wp_salt( 'secure_auth' ) );
	}

	/**
	 * Verify an author royalty token.
	 *
	 * @param array  $author_record Author computation data.
	 * @param string $token         Submitted token.
	 *
	 * @return bool True if authentic.
	 */
	public static function verify_royalty_token( array $author_record, $token ) {
		$expected = self::generate_verification_token( $author_record );
		return hash_equals( $expected, $token );
	}
}
