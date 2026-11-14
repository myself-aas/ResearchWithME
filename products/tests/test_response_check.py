"""Tests for response_check.py against the sample reviews and letter, whose problems are planted."""
import os, sys
SRC = os.path.join(os.path.dirname(__file__), '..', 'src', 'response-to-reviewers-check')
sys.path.insert(0, SRC)
import response_check as rc


def test_sample_letter():
    comments = rc.split_comments(rc.read(os.path.join(SRC, 'sample-reviews.txt')))
    assert [c['id'] for c in comments] == ['R1.1', 'R1.2', 'R1.3', 'R2.1', 'R2.2', 'R2.3', 'R2.4']
    results = {r['id']: r for r in rc.assess(comments, rc.read(os.path.join(SRC, 'sample-response.txt')))}
    assert results['R1.1']['status'] == 'answered' and not results['R1.1']['flags']
    assert results['R1.2']['status'] == 'answered' and len(results['R1.2']['flags']) == 1      # no location
    assert results['R1.3']['status'] == 'no response text'
    assert len(results['R2.1']['flags']) == 2                                                  # future tense, no location
    assert results['R2.2']['status'] == 'answered' and not results['R2.2']['flags']
    assert results['R2.3']['status'] == 'not found'                                            # never quoted
    assert results['R2.4']['status'] == 'answered' and not results['R2.4']['flags']            # declines, says so
    text = rc.report(list(results.values()), 'a', 'b')
    assert 'cannot tell whether' in text
    skeleton = rc.skeleton(comments)
    assert skeleton.count('Response: \n') == 7 and 'yours to write' in skeleton


def test_unnumbered_single_reviewer_and_same_paragraph_response():
    comments = rc.split_comments(['The sample is small and this should be acknowledged.', 'Please define all abbreviations at first use.'])
    assert [c['id'] for c in comments] == ['C1', 'C2']
    letter = ['Comment: The sample is small and this should be acknowledged. Response: We agree and now say so in the '
              'Discussion, page 12, line 300.', 'Something unrelated.']
    results = rc.assess(comments, letter)
    assert results[0]['status'] == 'answered' and not results[0]['flags'] and results[1]['status'] == 'not found'


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('ok', name)
