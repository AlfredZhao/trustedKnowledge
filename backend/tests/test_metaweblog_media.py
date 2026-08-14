import xmlrpc.client
import urllib.error

import pytest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.blog_publish import _extract_local_media_sources
from app.services import metaweblog
from app.services.metaweblog import MetaWeblogLocalMedia


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_extract_local_media_sources_handles_relative_and_absolute_urls():
    markdown = "\n".join(
        [
            "![local](/api/media/local-public-id/content)",
            "![absolute](https://www.cnblogs.com/api/media/absolute-public-id/content)",
            "![external](https://example.com/image.png)",
            "![duplicate](/api/media/local-public-id/content)",
        ]
    )

    assert _extract_local_media_sources(markdown) == [
        ("/api/media/local-public-id/content", "local-public-id"),
        ("https://www.cnblogs.com/api/media/absolute-public-id/content", "absolute-public-id"),
    ]


@pytest.mark.anyio
async def test_publish_metaweblog_post_uploads_local_media_before_new_post(monkeypatch):
    calls: list[tuple[str, tuple]] = []

    async def fake_call_xmlrpc(api_url: str, method_name: str, params: tuple):
        calls.append((method_name, params))
        if method_name == "metaWeblog.getUsersBlogs":
            return [{"blogid": "blog-1", "blogName": "Test Blog", "url": "https://www.cnblogs.com/demo"}]
        if method_name == "metaWeblog.newMediaObject":
            media = params[3]
            assert media["name"] == "image.png"
            assert media["type"] == "image/png"
            assert isinstance(media["bits"], xmlrpc.client.Binary)
            assert media["bits"].data == b"fake-image"
            return {"url": "https://img2026.cnblogs.com/blog/1/202607/image.png"}
        if method_name == "metaWeblog.newPost":
            content = params[3]
            assert "/api/media/local-public-id/content" not in content["description"]
            assert "https://img2026.cnblogs.com/blog/1/202607/image.png" in content["description"]
            return "post-1"
        raise AssertionError(f"Unexpected XML-RPC method: {method_name}")

    monkeypatch.setattr(metaweblog, "_call_xmlrpc", fake_call_xmlrpc)

    result = await metaweblog.publish_metaweblog_post(
        api_url="https://rpc.cnblogs.com/metaweblog/demo",
        username="demo",
        password="secret",
        title="Title",
        markdown="正文\n\n![image.png](/api/media/local-public-id/content)",
        categories=[],
        tags=[],
        publish=True,
        local_media=[
            MetaWeblogLocalMedia(
                source_url="/api/media/local-public-id/content",
                name="image.png",
                content_type="image/png",
                data=b"fake-image",
            )
        ],
    )

    assert result.post_id == "post-1"
    assert [method for method, _params in calls] == [
        "metaWeblog.getUsersBlogs",
        "metaWeblog.newMediaObject",
        "metaWeblog.newPost",
    ]


def test_xmlrpc_timeout_marks_new_post_result_as_unknown(monkeypatch):
    def raise_timeout(*_args, **_kwargs):
        raise urllib.error.URLError(TimeoutError("The write operation timed out"))

    monkeypatch.setattr(metaweblog.urllib.request, "urlopen", raise_timeout)

    with pytest.raises(metaweblog.MetaWeblogTimeoutError, match="发布结果可能未知"):
        metaweblog._call_xmlrpc_sync(
            "https://rpc.cnblogs.com/metaweblog/demo",
            "metaWeblog.newPost",
            ("blog-1", "demo", "secret", {"title": "Title"}, True),
        )
