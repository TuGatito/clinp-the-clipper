from api import API
import webview


def main():
    api = API()
    window = webview.create_window(
        "Clinp The Clipper", "resources/index.html", js_api=api
    )
    api.set_window(window)
    webview.start(gui="qt", icon="resources/Logo-Clinp.ico")


if __name__ == "__main__":
    main()
