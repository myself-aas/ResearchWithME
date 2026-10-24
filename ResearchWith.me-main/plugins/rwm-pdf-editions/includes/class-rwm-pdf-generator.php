<?php
/**
 * Scholarly PDF Generator Engine.
 *
 * Implements native PDF binary stream generation and CSS Paged Media rendering
 * for academic articles, adhering to Open Science citation standards.
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Generator
 */
class RWM_PDF_Generator {

	/**
	 * Build scholarly HTML document with CSS Paged Media for an article.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string Full HTML document.
	 */
	public static function render_article_html( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return '';
		}

		$author_id    = (int) $post->post_author;
		$user         = get_userdata( $author_id );
		$author_name  = $user ? $user->display_name : 'ResearchWith.me Contributor';
		$author_orcid = get_user_meta( $author_id, 'orcid_id', true );
		$doi          = RWM_PDF_Licensing::get_post_doi( $post_id );
		$license_key  = RWM_PDF_Licensing::get_post_license( $post_id );
		$license      = RWM_PDF_Licensing::get_license_info( $license_key );
		$categories   = get_the_category( $post_id );
		$tags         = get_the_tags( $post_id );
		$publish_date = get_the_date( 'F j, Y', $post );
		$content      = apply_filters( 'the_content', $post->post_content );
		$excerpt      = has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( $post->post_content ), 55 );

		ob_start();
		?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title><?php echo esc_html( get_the_title( $post ) ); ?> - ResearchWith.me</title>
	<meta name="citation_title" content="<?php echo esc_attr( get_the_title( $post ) ); ?>">
	<meta name="citation_author" content="<?php echo esc_attr( $author_name ); ?>">
	<meta name="citation_publication_date" content="<?php echo esc_attr( get_the_date( 'Y/m/d', $post ) ); ?>">
	<meta name="citation_journal_title" content="ResearchWith.me Peer-Reviewed Open Science Journal">
	<meta name="citation_doi" content="<?php echo esc_attr( $doi ); ?>">
	<meta name="citation_pdf_url" content="<?php echo esc_url( home_url( '?rwm_pdf=1&post_id=' . $post_id ) ); ?>">
	<style>
		@page {
			size: A4 portrait;
			margin: 22mm 18mm 22mm 18mm;
			@top-left {
				content: "ResearchWith.me &bull; Peer-Reviewed Open Science";
				font-size: 8pt;
				color: #64748B;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif;
			}
			@top-right {
				content: "DOI: <?php echo esc_html( $doi ); ?>";
				font-size: 8pt;
				color: #64748B;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif;
			}
			@bottom-center {
				content: "Page " counter(page) " of " counter(pages);
				font-size: 9pt;
				color: #64748B;
			}
		}

		body {
			font-family: "Georgia", "Cambria", "Times New Roman", serif;
			font-size: 11pt;
			line-height: 1.65;
			color: #1E293B;
			margin: 0;
			padding: 0;
			background: #FFF;
		}

		.rwm-pdf-header {
			border-bottom: 2px solid #0F172A;
			padding-bottom: 16px;
			margin-bottom: 24px;
		}

		.rwm-journal-meta {
			font-size: 9pt;
			text-transform: uppercase;
			letter-spacing: 1.2px;
			color: #2563EB;
			font-weight: 700;
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			margin-bottom: 8px;
		}

		h1.rwm-title {
			font-size: 24pt;
			line-height: 1.25;
			color: #0F172A;
			margin: 0 0 16px 0;
			font-weight: 700;
		}

		.rwm-authors {
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			font-size: 11pt;
			color: #334155;
			margin-bottom: 8px;
		}

		.rwm-orcid {
			font-size: 9pt;
			color: #16A34A;
			margin-left: 6px;
		}

		.rwm-doi-bar {
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			font-size: 9pt;
			color: #64748B;
			margin-top: 6px;
		}

		.rwm-abstract-box {
			background: #F8FAFC;
			border-left: 4px solid #2563EB;
			padding: 14px 18px;
			margin: 20px 0 28px 0;
			font-size: 10pt;
			line-height: 1.6;
		}

		.rwm-abstract-box strong {
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			text-transform: uppercase;
			font-size: 9pt;
			letter-spacing: 0.8px;
			color: #0F172A;
			display: block;
			margin-bottom: 6px;
		}

		.rwm-keywords {
			margin-top: 10px;
			font-size: 9pt;
			color: #475569;
			font-style: italic;
		}

		.rwm-body {
			text-align: justify;
			hyphens: auto;
		}

		.rwm-body p {
			margin: 0 0 14px 0;
			text-indent: 1.5em;
		}

		.rwm-body p:first-of-type {
			text-indent: 0;
		}

		.rwm-body h2 {
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			font-size: 15pt;
			color: #0F172A;
			border-bottom: 1px solid #E2E8F0;
			padding-bottom: 4px;
			margin-top: 28px;
		}

		.rwm-body h3 {
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			font-size: 13pt;
			color: #1E293B;
			margin-top: 22px;
		}

		.rwm-body blockquote {
			margin: 18px 24px;
			padding-left: 14px;
			border-left: 3px solid #CBD5E1;
			font-style: italic;
			color: #475569;
		}

		.rwm-license-footer {
			margin-top: 40px;
			padding-top: 18px;
			border-top: 1px solid #CBD5E1;
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
			font-size: 8.5pt;
			line-height: 1.5;
			color: #64748B;
			page-break-inside: avoid;
		}

		.rwm-license-badge {
			display: inline-block;
			padding: 2px 8px;
			background: #EEF2F6;
			border: 1px solid #CBD5E1;
			border-radius: 3px;
			font-weight: 700;
			color: #1E293B;
			margin-right: 6px;
		}

		@media print {
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			.no-print { display: none !important; }
		}
	</style>
</head>
<body>
	<header class="rwm-pdf-header">
		<div class="rwm-journal-meta">ResearchWith.me &bull; Open Science Journal &bull; Volume <?php echo esc_html( get_the_date( 'Y', $post ) ); ?></div>
		<h1 class="rwm-title"><?php echo esc_html( get_the_title( $post ) ); ?></h1>
		<div class="rwm-authors">
			<strong><?php echo esc_html( $author_name ); ?></strong>
			<?php if ( ! empty( $author_orcid ) ) : ?>
				<span class="rwm-orcid">ORCID: <?php echo esc_html( $author_orcid ); ?></span>
			<?php endif; ?>
		</div>
		<div class="rwm-doi-bar">
			<span><strong>Published:</strong> <?php echo esc_html( $publish_date ); ?></span> &bull;
			<span><strong>DOI:</strong> <a href="https://doi.org/<?php echo esc_attr( $doi ); ?>"><?php echo esc_html( $doi ); ?></a></span> &bull;
			<span><strong>Peer-Review:</strong> Verified Open Peer Review</span>
		</div>
	</header>

	<div class="rwm-abstract-box">
		<strong>Structured Abstract</strong>
		<div><?php echo wp_kses_post( $excerpt ); ?></div>
		<?php if ( ! empty( $categories ) || ! empty( $tags ) ) : ?>
			<div class="rwm-keywords">
				<strong>Keywords:</strong>
				<?php
				$kw = array();
				if ( ! empty( $categories ) && ! is_wp_error( $categories ) ) {
					foreach ( $categories as $cat ) {
						$kw[] = $cat->name;
					}
				}
				if ( ! empty( $tags ) && ! is_wp_error( $tags ) ) {
					foreach ( $tags as $tag ) {
						$kw[] = $tag->name;
					}
				}
				echo esc_html( implode( ', ', array_slice( $kw, 0, 8 ) ) );
				?>
			</div>
		<?php endif; ?>
	</div>

	<main class="rwm-body">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</main>

	<footer class="rwm-license-footer">
		<div>
			<span class="rwm-license-badge"><?php echo esc_html( $license['badge_text'] ); ?></span>
			<span>Published under <strong><?php echo esc_html( $license['name'] ); ?></strong>.</span>
		</div>
		<p style="margin:6px 0 0 0;">
			&copy; <?php echo esc_html( get_the_date( 'Y', $post ) ); ?> <?php echo esc_html( $author_name ); ?>. ResearchWith.me is an open-access platform. Commercial redistribution and author royalties governed by the ResearchWith.me Contributor Rights Protocol. Permanent digital archive record: <code>urn:rwm:post:<?php echo (int) $post_id; ?></code>.
		</p>
	</footer>
</body>
</html>
		<?php
		return ob_get_clean();
	}

	/**
	 * Generate pure-PHP binary PDF 1.4 stream.
	 *
	 * Zero external dependencies. Emits valid PDF document structure with
	 * header, xref table, font dictionaries, and text streams.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string Binary PDF stream.
	 */
	public static function generate_binary_pdf( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return '';
		}

		$title   = wp_strip_all_tags( get_the_title( $post ) );
		$author  = get_the_author_meta( 'display_name', $post->post_author );
		$doi     = RWM_PDF_Licensing::get_post_doi( $post_id );
		$license = RWM_PDF_Licensing::get_post_license( $post_id );
		$date    = get_the_date( 'F j, Y', $post );
		$content = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );

		// Clean and normalize text.
		$content = str_replace( array( "\r\n", "\r" ), "\n", $content );
		$paragraphs = array_filter( array_map( 'trim', explode( "\n\n", $content ) ) );

		$pdf = new Simple_PDF_Builder();
		$pdf->set_title( $title );
		$pdf->set_author( $author );
		$pdf->set_subject( 'DOI: ' . $doi . ' | License: ' . $license );

		// Cover / Header.
		$pdf->add_text( 'RESEARCHWITH.ME OPEN SCIENCE JOURNAL', 10, true, array( 0.15, 0.39, 0.92 ) );
		$pdf->add_space( 8 );
		$pdf->add_text( $title, 18, true, array( 0.06, 0.09, 0.16 ) );
		$pdf->add_space( 6 );
		$pdf->add_text( 'Author: ' . $author . '  |  Published: ' . $date . '  |  DOI: ' . $doi, 9, false, array( 0.4, 0.45, 0.55 ) );
		$pdf->add_text( 'Licensing: ' . $license . '  |  Royalties Status: Registered and Verified', 9, false, array( 0.4, 0.45, 0.55 ) );
		$pdf->add_space( 16 );

		// Abstract / Excerpt.
		$excerpt = has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( $content, 45 );
		$pdf->add_text( 'ABSTRACT', 11, true, array( 0.06, 0.09, 0.16 ) );
		$pdf->add_paragraph( $excerpt, 10, false, array( 0.2, 0.25, 0.35 ) );
		$pdf->add_space( 12 );

		// Body Paragraphs.
		$pdf->add_text( 'FULL ARTICLE', 11, true, array( 0.06, 0.09, 0.16 ) );
		foreach ( $paragraphs as $p ) {
			$pdf->add_paragraph( $p, 10, false, array( 0.12, 0.16, 0.23 ) );
			$pdf->add_space( 6 );
		}

		// Scholarly Licensing Appendix.
		$pdf->add_space( 16 );
		$pdf->add_text( 'RIGHTS, LICENSING & ROYALTIES PROTOCOL', 10, true, array( 0.15, 0.39, 0.92 ) );
		$pdf->add_paragraph(
			'This open-access scholarly article is published under ' . $license . '. Author moral rights and royalty distributions are maintained by the ResearchWith.me Contributor Governance Framework.',
			8,
			false,
			array( 0.4, 0.45, 0.55 )
		);

		return $pdf->output();
	}

	/**
	 * Generate a compiled Special Edition PDF from multiple articles.
	 *
	 * @param int        $edition_id Edition post ID.
	 * @param \WP_Post[] $posts      Articles included in the edition.
	 *
	 * @return string Binary PDF stream.
	 */
	public static function generate_edition_pdf( $edition_id, array $posts ) {
		$edition = get_post( $edition_id );

		if ( ! $edition || empty( $posts ) ) {
			return '';
		}

		$period  = get_post_meta( $edition_id, '_rwm_edition_period_name', true );
		$cadence = get_post_meta( $edition_id, '_rwm_edition_cadence', true );
		$pool    = (float) get_post_meta( $edition_id, '_rwm_edition_royalty_pool', true );
		$ledger  = get_post_meta( $edition_id, '_rwm_edition_royalties', true );

		$pdf = new Simple_PDF_Builder();
		$pdf->set_title( get_the_title( $edition ) );
		$pdf->set_author( 'ResearchWith.me Editorial Board' );
		$pdf->set_subject( 'Special Edition — ' . $period );

		// Cover.
		$pdf->add_text( 'RESEARCHWITH.ME OPEN SCIENCE JOURNAL', 10, true, array( 0.15, 0.39, 0.92 ) );
		$pdf->add_space( 14 );
		$pdf->add_text( get_the_title( $edition ), 20, true, array( 0.06, 0.09, 0.16 ) );
		$pdf->add_space( 8 );
		$pdf->add_text(
			sprintf(
				'%s edition  |  Period: %s  |  %d articles compiled',
				ucfirst( (string) $cadence ),
				$period ? $period : '—',
				count( $posts )
			),
			9,
			false,
			array( 0.4, 0.45, 0.55 )
		);
		$pdf->add_text(
			'Editorial record: rwm-edition-' . (int) $edition_id . '  |  Compiled ' . get_the_date( '', $edition ),
			9,
			false,
			array( 0.4, 0.45, 0.55 )
		);
		$pdf->add_space( 18 );

		// Table of contents.
		$pdf->add_text( 'CONTENTS', 11, true, array( 0.06, 0.09, 0.16 ) );
		$index = 1;
		foreach ( $posts as $post ) {
			$pdf->add_text(
				sprintf( '%d. %s', $index, wp_strip_all_tags( get_the_title( $post ) ) ),
				9,
				false,
				array( 0.15, 0.2, 0.28 )
			);
			++$index;
		}
		$pdf->add_space( 18 );

		// Articles.
		$index = 1;
		foreach ( $posts as $post ) {
			$author  = get_the_author_meta( 'display_name', $post->post_author );
			$doi     = RWM_PDF_Licensing::get_post_doi( $post->ID );
			$license = RWM_PDF_Licensing::get_post_license( $post->ID );
			$excerpt = has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( $post->post_content ), 40 );

			$pdf->add_text( sprintf( 'ARTICLE %d', $index ), 9, true, array( 0.15, 0.39, 0.92 ) );
			$pdf->add_text( wp_strip_all_tags( get_the_title( $post ) ), 14, true, array( 0.06, 0.09, 0.16 ) );
			$pdf->add_text(
				sprintf( '%s  |  DOI: %s  |  License: %s', $author, $doi, $license ),
				8,
				false,
				array( 0.4, 0.45, 0.55 )
			);
			$pdf->add_space( 6 );
			$pdf->add_paragraph( $excerpt, 9, false, array( 0.18, 0.23, 0.32 ) );
			$pdf->add_space( 14 );

			++$index;
		}

		// Royalty & licensing appendix.
		$pdf->add_space( 10 );
		$pdf->add_text( 'COMPILATION RIGHTS & ROYALTY LEDGER', 10, true, array( 0.15, 0.39, 0.92 ) );
		$pdf->add_paragraph(
			'This compiled edition aggregates previously published open-access articles. Each article retains its original license and copyright; the compilation itself adds no restriction. Contributor royalty shares are computed from article volume weighting and are recorded below for auditability.',
			8,
			false,
			array( 0.4, 0.45, 0.55 )
		);

		if ( is_array( $ledger ) && ! empty( $ledger['contributors'] ) ) {
			$pdf->add_space( 6 );
			$pdf->add_text( sprintf( 'Royalty pool: %.2f tokens', (float) $pool ), 9, true, array( 0.06, 0.09, 0.16 ) );
			foreach ( $ledger['contributors'] as $contributor ) {
				$pdf->add_text(
					sprintf(
						'%s — %d article(s), %.2f%% share, payout %.2f',
						$contributor['name'],
						(int) $contributor['article_count'],
						(float) $contributor['share_percent'],
						(float) $contributor['payout_amount']
					),
					8,
					false,
					array( 0.25, 0.3, 0.4 )
				);
			}
		}

		return $pdf->output();
	}
}

/**
 * Lightweight pure-PHP PDF Stream Builder.
 *
 * Implements PDF 1.4 specification (A4 coordinates, fonts, page stream).
 */
class Simple_PDF_Builder {

	/**
	 * PDF Objects buffer.
	 *
	 * @var array
	 */
	private $objects = array();

	/**
	 * Content stream buffer.
	 *
	 * @var string
	 */
	private $stream = '';

	/**
	 * Metadata.
	 *
	 * @var array
	 */
	private $meta = array(
		'title'   => 'Scholarly Article',
		'author'  => 'ResearchWith.me',
		'subject' => 'Open Science',
	);

	/**
	 * Current cursor position (A4: 595.28 x 841.89 points).
	 *
	 * @var float
	 */
	private $cursor_y = 780.0;
	private $margin_x = 54.0;
	private $page_width = 595.28;
	private $page_height = 841.89;

	/**
	 * Set document title.
	 *
	 * @param string $title Title.
	 */
	public function set_title( $title ) {
		$this->meta['title'] = $title;
	}

	/**
	 * Set author.
	 *
	 * @param string $author Author.
	 */
	public function set_author( $author ) {
		$this->meta['author'] = $author;
	}

	/**
	 * Set subject.
	 *
	 * @param string $subject Subject.
	 */
	public function set_subject( $subject ) {
		$this->meta['subject'] = $subject;
	}

	/**
	 * Add vertical spacing.
	 *
	 * @param float $pts Space in points.
	 */
	public function add_space( $pts ) {
		$this->cursor_y -= $pts;
	}

	/**
	 * Add single line text.
	 *
	 * @param string  $text  Text string.
	 * @param int     $size  Font size.
	 * @param bool    $bold  Bold flag.
	 * @param array   $color RGB float array (0.0 - 1.0).
	 */
	public function add_text( $text, $size = 11, $bold = false, $color = array( 0, 0, 0 ) ) {
		$safe_text = $this->escape_text( $text );
		$font_id   = $bold ? '/F2' : '/F1';
		$r = isset( $color[0] ) ? $color[0] : 0;
		$g = isset( $color[1] ) ? $color[1] : 0;
		$b = isset( $color[2] ) ? $color[2] : 0;

		$this->stream .= sprintf(
			"BT\n%.3f %.3f %.3f rg\n%s %d Tf\n1 0 0 1 %.2f %.2f Tm\n(%s) Tj\nET\n",
			$r,
			$g,
			$b,
			$font_id,
			(int) $size,
			$this->margin_x,
			$this->cursor_y,
			$safe_text
		);

		$this->cursor_y -= ( $size * 1.35 );
	}

	/**
	 * Add wrapped multi-line paragraph.
	 *
	 * @param string $text  Paragraph text.
	 * @param int    $size  Font size.
	 * @param bool   $bold  Bold flag.
	 * @param array  $color RGB array.
	 */
	public function add_paragraph( $text, $size = 10, $bold = false, $color = array( 0.1, 0.1, 0.1 ) ) {
		$max_chars = 85;
		$words = explode( ' ', $text );
		$current_line = '';

		foreach ( $words as $word ) {
			if ( strlen( $current_line . ' ' . $word ) > $max_chars ) {
				$this->add_text( trim( $current_line ), $size, $bold, $color );
				$current_line = $word;
			} else {
				$current_line .= ( empty( $current_line ) ? '' : ' ' ) . $word;
			}
		}

		if ( ! empty( $current_line ) ) {
			$this->add_text( trim( $current_line ), $size, $bold, $color );
		}
	}

	/**
	 * Escape PDF string.
	 *
	 * @param string $text Text.
	 *
	 * @return string Escaped string.
	 */
	private function escape_text( $text ) {
		$text = iconv( 'UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $text );
		$text = str_replace( array( '\\', '(', ')' ), array( '\\\\', '\\(', '\\)' ), $text );
		return $text;
	}

	/**
	 * Compile and output PDF binary string.
	 *
	 * @return string PDF stream.
	 */
	public function output() {
		$out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
		$offsets = array();

		// Object 1: Catalog
		$offsets[1] = strlen( $out );
		$out .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

		// Object 2: Pages
		$offsets[2] = strlen( $out );
		$out .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";

		// Object 3: Page
		$offsets[3] = strlen( $out );
		$out .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n";

		// Object 4: Content Stream
		$stream_len = strlen( $this->stream );
		$offsets[4] = strlen( $out );
		$out .= "4 0 obj\n<< /Length " . $stream_len . " >>\nstream\n" . $this->stream . "endstream\nendobj\n";

		// Object 5: Font F1 (Helvetica)
		$offsets[5] = strlen( $out );
		$out .= "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

		// Object 6: Font F2 (Helvetica-Bold)
		$offsets[6] = strlen( $out );
		$out .= "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";

		// Object 7: Info
		$offsets[7] = strlen( $out );
		$safe_title   = $this->escape_text( $this->meta['title'] );
		$safe_author  = $this->escape_text( $this->meta['author'] );
		$safe_subject = $this->escape_text( $this->meta['subject'] );
		$out .= "7 0 obj\n<< /Title (" . $safe_title . ") /Author (" . $safe_author . ") /Subject (" . $safe_subject . ") /Creator (ResearchWith.me PDF Engine) /Producer (ResearchWith.me) >>\nendobj\n";

		// XRef Table
		$xref_pos = strlen( $out );
		$out .= "xref\n0 8\n";
		$out .= "0000000000 65535 f \n";
		for ( $i = 1; $i <= 7; $i++ ) {
			$out .= sprintf( "%010d 00000 n \n", $offsets[ $i ] );
		}

		// Trailer
		$out .= "trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\nstartxref\n" . $xref_pos . "\n%%EOF\n";

		return $out;
	}
}
